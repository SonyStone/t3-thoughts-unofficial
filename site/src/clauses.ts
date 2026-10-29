import { parseQuery, type Query } from "./query.ts";

/**
 * The search box shows a query as chips: a list of clauses joined by AND, each clause
 * a list of terms joined by OR, each term possibly negated. The query string stays the
 * source of truth; this is a view of it that the chip menu can edit and write back.
 *
 *   product:t3-code, (mood:hype || mood:salty), -kind:repost
 *   → [[product:t3-code], [mood:hype, mood:salty], [-kind:repost]]
 *
 * A clause too nested for chips (parentheses inside OR) is kept as one raw chip.
 */
export type Term = { raw: string; neg: boolean };
export type Clause = { terms: Term[] } | { raw: string };

function term(query: Query): Term | undefined {
  if (query.op === "term") return { raw: query.raw, neg: false };
  if (query.op === "not" && query.child.op === "term") return { raw: query.child.raw, neg: true };
  return undefined;
}

function show(query: Query): string {
  if (query.op === "term") return query.raw;
  if (query.op === "not") return `-${show(query.child)}`;
  return `(${query.children.map(show).join(query.op === "and" ? ", " : " || ")})`;
}

function clause(query: Query): Clause {
  const single = term(query);
  if (single) return { terms: [single] };
  if (query.op === "or") {
    const terms = query.children.map(term);
    if (terms.every((t): t is Term => !!t)) return { terms };
  }
  return { raw: show(query) };
}

export function toClauses(query: string): Clause[] {
  const parsed = parseQuery(query);
  if (!parsed) return [];
  return parsed.op === "and" ? parsed.children.map(clause) : [clause(parsed)];
}

const termText = (t: Term) => `${t.neg ? "-" : ""}${t.raw}`;

/** AND binds tighter than OR (as on derpibooru), so an OR chip among others needs parentheses. */
export function toQuery(clauses: Clause[]): string {
  const several = clauses.length > 1;
  return clauses
    .map((c) => {
      if ("raw" in c) return c.raw;
      const text = c.terms.map(termText).join(" || ");
      return several && c.terms.length > 1 ? `(${text})` : text;
    })
    .filter(Boolean)
    .join(", ");
}

export type TagAction = "only" | "and" | "or" | "exclude" | "remove";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function without(clauses: Clause[], tag: string): Clause[] {
  return clauses
    .map((c) => ("raw" in c ? c : { terms: c.terms.filter((t) => !same(t.raw, tag)) }))
    .filter((c) => "raw" in c || c.terms.length > 0);
}

/**
 * What the tag menu does to a query:
 * only — the query becomes this tag; and — narrow by it; or — widen the last clause with it;
 * exclude — require its absence (flips it if present); remove — drop it everywhere.
 */
export function applyTag(query: string, tag: string, action: TagAction): string {
  const clauses = toClauses(query);
  if (action === "only") return tag;
  if (action === "remove") return toQuery(without(clauses, tag));
  const rest = without(clauses, tag);
  if (action === "and") return toQuery([...rest, { terms: [{ raw: tag, neg: false }] }]);
  if (action === "exclude") return toQuery([...rest, { terms: [{ raw: tag, neg: true }] }]);
  // or: join the last chip clause, or start one
  const last = rest.at(-1);
  if (last && !("raw" in last)) {
    return toQuery([...rest.slice(0, -1), { terms: [...last.terms, { raw: tag, neg: false }] }]);
  }
  return toQuery([...rest, { terms: [{ raw: tag, neg: false }] }]);
}

/** Whether the query already requires this tag as a plain AND clause. */
export function hasTag(query: string, tag: string): boolean {
  return toClauses(query).some((c) => !("raw" in c) && c.terms.length === 1 && !c.terms[0].neg && same(c.terms[0].raw, tag));
}
