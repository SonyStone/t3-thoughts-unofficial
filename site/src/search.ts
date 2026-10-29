import { vocabulary } from "virtual:content";
import { entries, type Entry, type MetricKey } from "./content";
import { parseQuery, type Query } from "./query";

/**
 * Search over entries with the syntax from query.ts. Besides tags (with * wildcards and
 * aliases) a term can be a field, `kind:reply`, `weight:>=3`, `date:>2026-10-28`,
 * `likes:>500`, `views:>=100000`, or text,
 * `"thundering herd"`, `text:herd`. A bare word that no entry carries as a tag searches the text.
 */

type Node =
  | { op: "and" | "or"; children: Node[] }
  | { op: "not"; child: Node }
  | { op: "term"; test: (doc: Doc) => boolean };

type Doc = {
  entry: Entry;
  metrics: Partial<Record<MetricKey, number>>;
  tags: Set<string>;
  kinds: Set<string>;
  days: string[];
  weight: number;
  text: string;
};

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");

function foreignText(post: Entry["latest"]["parent"]): string {
  return post && post !== "unavailable" ? `${post.author} ${post.name ?? ""} ${post.text ?? ""}` : "";
}

const METRICS: MetricKey[] = ["likes", "views", "replies", "reposts", "quotes", "bookmarks", "comments"];

const docs: Doc[] = entries.map((entry) => ({
  entry,
  tags: new Set(entry.items.flatMap((item) => item.tags)),
  kinds: new Set(entry.items.map((item) => item.kind)),
  days: entry.items.map((item) => item.day),
  weight: Math.max(...entry.items.map((item) => item.weight)),
  metrics: Object.fromEntries(
    METRICS.map((key) => [key, Math.max(-1, ...entry.items.map((item) => item.metrics?.[key] ?? -1))]),
  ),
  // every language at once, so a Russian word finds the post while reading in English
  text: entry.items
    .map((item) =>
      [
        item.title,
        item.text,
        foreignText(item.parent),
        foreignText(item.quoted),
        stripHtml(item.html),
        ...(item.chapterText ?? []).flatMap((chapter) => [chapter.title, stripHtml(chapter.html)]),
        ...Object.values(item.translations).flatMap((translation) => [
          translation.title,
          stripHtml(translation.html),
          ...(translation.chapters ?? []).flatMap((chapter) => [chapter.title, stripHtml(chapter.html)]),
        ]),
      ].join(" "),
    )
    .join(" ")
    .toLowerCase(),
}));

/** Every tag with the number of entries that carry it, most used first. */
export const tagCounts: [string, number][] = (() => {
  const counts = new Map<string, number>();
  for (const doc of docs) for (const tag of doc.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
})();

const usedTags = tagCounts.map(([tag]) => tag);

export function namespaceOf(tag: string): string | undefined {
  const index = tag.indexOf(":");
  return index > 0 ? tag.slice(0, index) : undefined;
}

function compare(value: string | number, spec: string): boolean {
  const match = spec.match(/^(>=|<=|>|<)?(.*)$/)!;
  const [, op, raw] = match;
  const target = typeof value === "number" ? Number(raw) : raw;
  if (op === ">") return value > target;
  if (op === "<") return value < target;
  if (op === ">=") return value >= target;
  if (op === "<=") return value <= target;
  return value === target;
}

function wildcard(pattern: string): RegExp {
  return new RegExp(`^${pattern.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
}

/** Turns one term into a test, resolving aliases and bare names of namespaced tags. */
function term(raw: string): Node {
  const text = raw.trim().toLowerCase();
  const phrase = text.match(/^"(.*)"?$/);
  if (phrase) {
    const needle = phrase[1].replace(/"$/, "");
    return { op: "term", test: (doc) => doc.text.includes(needle) };
  }
  const field = text.match(/^(kind|date|weight|text|sort|likes|views|replies|reposts|quotes|bookmarks|comments):(.*)$/);
  if (field) {
    const [, name, value] = field;
    // `sort:likes` orders the results (see sortOf) and filters nothing
    if (name === "sort") return { op: "term", test: () => true };
    if ((METRICS as string[]).includes(name)) {
      return { op: "term", test: (doc) => (doc.metrics[name as MetricKey] ?? -1) >= 0 && compare(doc.metrics[name as MetricKey]!, value) };
    }
    if (name === "kind") return { op: "term", test: (doc) => doc.kinds.has(value) };
    if (name === "date") return { op: "term", test: (doc) => doc.days.some((day) => compare(day, value)) };
    if (name === "weight") return { op: "term", test: (doc) => compare(doc.weight, value) };
    return { op: "term", test: (doc) => doc.text.includes(value) };
  }
  if (text.includes("*")) {
    const pattern = wildcard(text);
    return { op: "term", test: (doc) => [...doc.tags].some((tag) => pattern.test(tag)) };
  }
  const canonical = vocabulary.aliases[text] ?? text;
  // `opus-5.5` finds `model:opus-5.5`; a tag nobody carries yet falls through to text
  const matching = usedTags.filter((tag) => tag === canonical || tag.endsWith(`:${canonical}`));
  if (matching.length > 0) return { op: "term", test: (doc) => matching.some((tag) => doc.tags.has(tag)) };
  return { op: "term", test: (doc) => doc.text.includes(text) };
}

function run(node: Node, doc: Doc): boolean {
  if (node.op === "term") return node.test(doc);
  if (node.op === "not") return !run(node.child, doc);
  if (node.op === "and") return node.children.every((child) => run(child, doc));
  return node.children.some((child) => run(child, doc));
}

function compile(query: Query): Node {
  if (query.op === "term") return term(query.raw);
  if (query.op === "not") return { op: "not", child: compile(query.child) };
  return { op: query.op, children: query.children.map(compile) };
}

function positives(query: Query): Query[] {
  if (query.op === "term") return [query];
  if (query.op === "not") return [];
  return query.children.flatMap(positives);
}

/**
 * Which video chapters a query is about: the query passes on the chapter's tags and at
 * least one of its non-negated terms names one of them. Text terms never match a chapter.
 */
export function chapterMatcher(query: string): (tags: string[]) => boolean {
  const parsed = parseQuery(query);
  if (!parsed) return () => false;
  const tree = compile(parsed);
  const named = positives(parsed).map(compile);
  return (tags) => {
    const doc: Doc = {
      entry: entries[0],
      metrics: {},
      tags: new Set(tags),
      kinds: new Set(),
      days: [],
      weight: 0,
      text: "",
    };
    return run(tree, doc) && named.some((node) => run(node, doc));
  };
}

export function search(query: string): Entry[] {
  const parsed = parseQuery(query);
  const tree = parsed && compile(parsed);
  return tree ? docs.filter((doc) => run(tree, doc)).map((doc) => doc.entry) : entries;
}

export type SortKey = "new" | "likes" | "views";

/** The order a query asks for with `sort:likes` / `sort:views`; newest first otherwise. */
export function sortOf(query: string): SortKey {
  const match = query.match(/(?:^|[\s,(|])sort:(likes|views)\b/i);
  return match ? (match[1].toLowerCase() as SortKey) : "new";
}

/** Not tags, but terms worth suggesting; -1 means no count to show. */
const SPECIAL: [string, number][] = [
  ["sort:likes", -1],
  ["sort:views", -1],
];

export function suggest(fragment: string, limit = 8): [string, number][] {
  const needle = fragment.trim().toLowerCase();
  if (!needle) return [];
  const special = SPECIAL.filter(([term]) => term.startsWith(needle) || (needle.length > 1 && term.includes(needle)));
  const starts = tagCounts.filter(([tag]) => tag.startsWith(needle) || tag.split(":")[1]?.startsWith(needle));
  const contains = tagCounts.filter(([tag]) => !starts.some(([other]) => other === tag) && tag.includes(needle));
  return [...special, ...starts, ...contains].slice(0, limit);
}
