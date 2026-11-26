import { vocabulary } from "virtual:content";
import { entries, type Entry, type Kind, type MetricKey } from "./content";
import { parseQuery, type Query } from "./query";
import type { Described } from "./types";

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
  ranges: [string, string][];
  weight: number;
  text: string;
};

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");

function foreignText(post: Entry["latest"]["parent"]): string {
  return post && post !== "unavailable" ? `${post.author} ${post.name ?? ""} ${post.text ?? ""}` : "";
}

function describedText(value: Described | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : Object.values(value).join(" ");
}

const METRICS: MetricKey[] = ["likes", "views", "replies", "reposts", "quotes", "bookmarks", "comments"];

const docs: Doc[] = entries.map((entry) => ({
  entry,
  tags: new Set(entry.items.flatMap((item) => item.tags)),
  kinds: new Set(entry.items.map((item) => item.kind)),
  days: entry.items.map((item) => item.day),
  ranges: entry.items.flatMap((item) => (item.from && item.to ? [[item.from, item.to] as [string, string]] : [])),
  weight: Math.max(...entry.items.map((item) => item.weight)),
  metrics: Object.fromEntries(
    METRICS.map((key) => [key, Math.max(-1, ...entry.items.map((item) => item.metrics?.[key] ?? -1))]),
  ),
  // every language at once, so a Russian word finds the post while reading in English
  text: entry.items
    .map((item) =>
      [
        item.title,
        item.summary,
        item.text,
        foreignText(item.parent),
        foreignText(item.quoted),
        stripHtml(item.html),
        ...(item.chapterText ?? []).flatMap((chapter) => [chapter.title, stripHtml(chapter.html)]),
        ...(item.sectionText ?? []).flatMap((section) => [section.title, stripHtml(section.dek ?? ""), stripHtml(section.html)]),
        ...Object.values(item.embeds ?? {}).flatMap((embed) => [
          embed.text,
          foreignText(embed.parent),
          foreignText(embed.quoted),
        ]),
        ...Object.values(item.frames ?? {}).flatMap((frame) => [frame.videoTitle ?? "", describedText(frame.caption)]),
        ...Object.values(item.translations).flatMap((translation) => [
          translation.title,
          translation.summary,
          stripHtml(translation.html),
          ...(translation.chapters ?? []).flatMap((chapter) => [chapter.title, stripHtml(chapter.html)]),
          ...(translation.sections ?? []).flatMap((section) => [section.title, stripHtml(section.dek ?? ""), stripHtml(section.html)]),
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

function compareRange(from: string, to: string, spec: string): boolean {
  const match = spec.match(/^(>=|<=|>|<)?(.*)$/)!;
  const [, op, target] = match;
  if (op === ">") return to > target;
  if (op === "<") return from < target;
  if (op === ">=") return to >= target;
  if (op === "<=") return from <= target;
  return from <= target && target <= to;
}

const ENTRY_ONLY_FIELD = /^(kind|date|weight|sort|likes|views|replies|reposts|quotes|bookmarks|comments):/i;

/** Turns one term into a test, resolving aliases and bare names of namespaced tags. */
function term(raw: string, sectionMode = false): Node {
  const text = raw.trim().toLowerCase();
  const phrase = text.match(/^"(.*)"?$/);
  if (phrase) {
    const needle = phrase[1].replace(/"$/, "");
    return { op: "term", test: (doc) => doc.text.includes(needle) };
  }
  const field = text.match(/^(kind|date|weight|text|sort|likes|views|replies|reposts|quotes|bookmarks|comments):(.*)$/);
  if (field) {
    const [, name, value] = field;
    if (sectionMode && name !== "text") return { op: "term", test: () => true };
    // `sort:likes` orders the results (see sortOf) and filters nothing
    if (name === "sort") return { op: "term", test: () => true };
    if ((METRICS as string[]).includes(name)) {
      return { op: "term", test: (doc) => (doc.metrics[name as MetricKey] ?? -1) >= 0 && compare(doc.metrics[name as MetricKey]!, value) };
    }
    if (name === "kind") return { op: "term", test: (doc) => doc.kinds.has(value) };
    if (name === "date") {
      return {
        op: "term",
        test: (doc) =>
          doc.days.some((day) => compare(day, value)) || doc.ranges.some(([from, to]) => compareRange(from, to, value)),
      };
    }
    if (name === "weight") return { op: "term", test: (doc) => compare(doc.weight, value) };
    const needle = value.replace(/^"|"$/g, "");
    return { op: "term", test: (doc) => doc.text.includes(needle) };
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

function compile(query: Query, sectionMode = false): Node {
  if (query.op === "term") return term(query.raw, sectionMode);
  if (query.op === "not") {
    // Negated entry-level fields (-kind:repost) already passed on the arc; don't invert them into false on sections
    if (sectionMode && query.child.op === "term" && ENTRY_ONLY_FIELD.test(query.child.raw.trim())) {
      return { op: "term", test: () => true };
    }
    return { op: "not", child: compile(query.child, sectionMode) };
  }
  return { op: query.op, children: query.children.map((child) => compile(child, sectionMode)) };
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
  const named = positives(parsed).map((q) => compile(q));
  return (tags) => {
    const doc: Doc = {
      entry: entries[0],
      metrics: {},
      tags: new Set(tags),
      kinds: new Set(),
      days: [],
      ranges: [],
      weight: 0,
      text: "",
    };
    return run(tree, doc) && named.some((node) => run(node, doc));
  };
}

/**
 * Which arc sections a query matches: preserves the full Boolean query tree (AND, OR, NOT)
 * against each section's tags and EN/RU text (including embeds), while treating entry-level
 * fields (kind, date, weight, sort, metrics) as already satisfied by the arc.
 */
export function sectionMatcher(query: string): (tags: string[], text: string) => boolean {
  const parsed = parseQuery(query);
  if (!parsed) return () => false;
  const tree = compile(parsed, true);
  const named = positives(parsed)
    .filter((q) => q.op === "term" && !ENTRY_ONLY_FIELD.test(q.raw.trim()))
    .map((q) => compile(q, true));
  if (named.length === 0) return () => false;
  return (tags, text) => {
    const doc: Doc = {
      entry: entries[0],
      metrics: {},
      tags: new Set(tags),
      kinds: new Set(["arc"]),
      days: [],
      ranges: [],
      weight: 3,
      text: text.toLowerCase(),
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

const ALL_KINDS: Kind[] = ["arc", "video", "post", "reply", "quote", "repost"];

/** Not tags, but terms worth suggesting; -1 means no count to show. */
const SPECIAL: [string, number][] = [
  ...ALL_KINDS.map(
    (kind) => [`kind:${kind}`, entries.filter((entry) => entry.items.some((item) => item.kind === kind)).length] as [string, number],
  ).filter(([, count]) => count > 0),
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

/** When each tag was last used, for ordering a cloud by what is fresh. */
export const tagLastSeen: Map<string, number> = (() => {
  const seen = new Map<string, number>();
  for (const doc of docs) {
    const time = doc.entry.latest.createdAt.getTime();
    for (const tag of doc.tags) seen.set(tag, Math.max(seen.get(tag) ?? 0, time));
  }
  return seen;
})();

const SIDE_NAMESPACES = new Set(["mood", "format", "kind"]);

/**
 * Tags Opus put on the same entries as this term, most shared first. Implied tags stay out:
 * `model:opus-5.5` always comes with `model:opus`, which says nothing.
 */
export function relatedTags(raw: string, limit = 6): [string, number][] {
  const found = search(raw);
  const counts = new Map<string, number>();
  for (const entry of found) {
    for (const tag of new Set(entry.items.flatMap((item) => item.ownTags))) {
      if (SIDE_NAMESPACES.has(namespaceOf(tag) ?? "")) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const self = raw.replace(/^[-!]/, "").toLowerCase();
  return [...counts]
    .filter(([tag]) => tag !== self && !tag.endsWith(`:${self}`))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

const words = (tag: string) => (tag.split(":").pop() ?? tag).split(/[-._]/).filter((word) => word.length >= 3);

/** Tags with a name like this one in the same namespace (opus, opus-5.5) and its aliases. */
export function similarTags(raw: string, limit = 6): [string, number][] {
  const self = raw.replace(/^[-!]/, "").toLowerCase();
  const ns = namespaceOf(self);
  const mine = words(self);
  const aliased = Object.entries(vocabulary.aliases)
    .filter(([, canonical]) => canonical === self)
    .map(([alias]) => alias);
  return tagCounts
    .filter(([tag]) => tag !== self && namespaceOf(tag) === ns)
    .filter(([tag]) => aliased.includes(tag) || words(tag).some((word) => mine.some((other) => word.startsWith(other) || other.startsWith(word))))
    .slice(0, limit);
}

const FIELDS = /^(kind|date|weight|text|sort|likes|views|replies|reposts|quotes|bookmarks|comments):/;

/**
 * Whether a typed word is a term the search knows (a tag, an alias, a field, a wildcard)
 * rather than words to look for in the text.
 */
export function knowsTerm(raw: string): boolean {
  const text = raw.replace(/^[-!]/, "").trim().toLowerCase();
  if (!text) return false;
  if (FIELDS.test(text) || text.includes("*") || text.startsWith('"')) return true;
  const canonical = vocabulary.aliases[text] ?? text;
  return usedTags.some((tag) => tag === canonical || tag.endsWith(`:${canonical}`));
}

/** Words to look for in the text, as one term: text:"thundering herd". */
export function textTerm(words: string): string {
  const neg = /^[-!]/.test(words) ? "-" : "";
  return `${neg}text:"${words.replace(/^[-!]/, "").replace(/"/g, "").trim()}"`;
}
