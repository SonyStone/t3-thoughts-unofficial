import { parseQuery, type Query } from "./query.ts";

/**
 * The search box shows a query as chips: a list of clauses joined by AND, each clause
 * a list of terms joined by OR, each term possibly negated. The query string stays the
 * source of truth; this is a view of it that the chip menu can edit and write back.
 *
 *   product:t3-code (mood:hype || mood:salty) -kind:repost
 *   → [[product:t3-code], [mood:hype, mood:salty], [-kind:repost]]
 *
 * Inside an OR, one alternative may itself be an AND of plain terms, drawn in brackets:
 *   ui || (company:anthropic model:claude)  → [[ui, (company:anthropic and model:claude)]]
 * Anything more nested is kept as one raw chip.
 */
export type Term = { raw: string; neg: boolean; all?: Term[] };
export type Clause = { terms: Term[] } | { raw: string };

function plain(query: Query): Term | undefined {
  if (query.op === "term") return { raw: query.raw, neg: false };
  if (query.op === "not" && query.child.op === "term") return { raw: query.child.raw, neg: true };
  return undefined;
}

/** A plain term, or an AND of plain terms (only as one alternative of an OR). */
function term(query: Query, inOr = false): Term | undefined {
  const single = plain(query);
  if (single || !inOr || query.op !== "and") return single;
  const all = query.children.map(plain);
  return all.every((t): t is Term => !!t) ? { raw: group(all), neg: false, all } : undefined;
}

const group = (all: Term[]) => `(${all.map(termText).join(" ")})`;

function show(query: Query): string {
  if (query.op === "term") return query.raw;
  if (query.op === "not") return `-${show(query.child)}`;
  return `(${query.children.map(show).join(query.op === "and" ? " " : " || ")})`;
}

function clause(query: Query): Clause {
  const single = term(query);
  if (single) return { terms: [single] };
  if (query.op === "or") {
    const terms = query.children.map((child) => term(child, true));
    if (terms.every((t): t is Term => !!t)) return { terms };
  }
  return { raw: show(query) };
}

/**
 * AND inside AND and OR inside OR are the same as one level: (a (b c)) is a b c. Flattened
 * first, so leftovers of editing (an "and" group whose "or" partners all left) become
 * plain chips again instead of one raw chip.
 */
function flat(query: Query): Query {
  if (query.op === "term") return query;
  if (query.op === "not") return { op: "not", child: flat(query.child) };
  const children = query.children.map(flat).flatMap((child) => (child.op === query.op ? child.children : [child]));
  return children.length === 1 ? children[0] : { op: query.op, children };
}

export function toClauses(query: string): Clause[] {
  const parsed = parseQuery(query);
  if (!parsed) return [];
  const tree = flat(parsed);
  return tree.op === "and" ? tree.children.map(clause) : [clause(tree)];
}

function termText(t: Term): string {
  return `${t.neg ? "-" : ""}${t.raw}`;
}

/** AND binds tighter than OR (as on derpibooru), so an OR chip among others needs parentheses. */
export function toQuery(clauses: Clause[]): string {
  // an "and" group left alone in its clause is just its parts, each a clause of its own
  clauses = clauses.flatMap((c) => ("raw" in c || c.terms.length !== 1 || !c.terms[0].all || c.terms[0].neg ? [c] : c.terms[0].all.map((t) => ({ terms: [t] }))));
  const several = clauses.length > 1;
  return clauses
    .map((c) => {
      if ("raw" in c) return c.raw;
      const text = c.terms.map(termText).join(" || ");
      return several && c.terms.length > 1 ? `(${text})` : text;
    })
    .filter(Boolean)
    .join(" ");
}

export type TagAction = "only" | "and" | "or" | "exclude" | "remove";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Namespaces where an entry has one value, so two of them together find nothing: a new one
 * replaces the old instead of narrowing to zero. A post is one kind and one mood; one sort,
 * one rating floor and one day make sense at a time.
 */
const EXCLUSIVE = new Set(["kind", "mood", "sort", "weight", "date"]);

const prefix = (tag: string) => (tag.includes(":") ? tag.slice(0, tag.indexOf(":")).toLowerCase() : undefined);

/** Drops required tags that the new one replaces (same exclusive namespace); exclusions stay. */
function withoutRivals(clauses: Clause[], tag: string): Clause[] {
  const ns = prefix(tag);
  if (!ns || !EXCLUSIVE.has(ns)) return clauses;
  return clauses.filter((c) => "raw" in c || c.terms.length > 1 || c.terms[0].neg || prefix(c.terms[0].raw) !== ns);
}

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
  if (action === "and") return toQuery([...withoutRivals(rest, tag), { terms: [{ raw: tag, neg: false }] }]);
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

/** Where a dragged term goes: into a clause as one more OR, or as its own clause before `index`. */
export type Drop = { join: number } | { before: number };

/** A chip dragged inside the search box: out of its clause and into another place. */
export function moveTerm(query: string, from: { clause: number; term: number }, to: Drop, neg?: boolean): string {
  const clauses = toClauses(query);
  const source = clauses[from.clause];
  if (!source || "raw" in source) return query;
  const moved = { ...source.terms[from.term], ...(neg === undefined ? {} : { neg }) };
  // leave a hole first, so `to` keeps pointing at the clauses it was computed for
  const holed: (Clause | undefined)[] = clauses.map((c, i) =>
    i === from.clause ? { terms: source.terms.filter((_, t) => t !== from.term) } : c,
  );
  if ("join" in to) {
    const target = holed[to.join];
    if (target && !("raw" in target)) holed[to.join] = { terms: [...target.terms, moved] };
  } else {
    holed.splice(to.before, 0, { terms: [moved] });
  }
  return toQuery(holed.filter((c): c is Clause => !!c && ("raw" in c || c.terms.length > 0)));
}

/** A tag dragged in from the page: a new clause, or one more OR in a clause. */
export function dropTag(query: string, tag: string, to: Drop): string {
  const clauses = "join" in to ? without(toClauses(query), tag) : withoutRivals(without(toClauses(query), tag), tag);
  const term = { raw: tag, neg: false };
  if ("join" in to) {
    const target = clauses[to.join];
    if (target && !("raw" in target)) clauses[to.join] = { terms: [...target.terms, term] };
    else clauses.push({ terms: [term] });
  } else {
    clauses.splice(Math.min(to.before, clauses.length), 0, { terms: [term] });
  }
  return toQuery(clauses);
}

/** A chip dropped on the "without" or "remove" place: flip its minus, or take it out. */
export function editTerm(query: string, at: { clause: number; term: number }, change: "negate" | "remove"): string {
  const clauses = toClauses(query).map((c, i) => {
    if (i !== at.clause || "raw" in c) return c;
    if (change === "remove") return { terms: c.terms.filter((_, t) => t !== at.term) };
    return { terms: c.terms.map((term, t) => (t === at.term ? { ...term, neg: !term.neg } : term)) };
  });
  return toQuery(clauses.filter((c) => "raw" in c || c.terms.length > 0));
}

/** Whether the query excludes this tag on its own (`-tag` as a clause). */
export function excludesTag(query: string, tag: string): boolean {
  return toClauses(query).some((c) => !("raw" in c) && c.terms.length === 1 && c.terms[0].neg && same(c.terms[0].raw, tag));
}

/**
 * A term dropped on the "and" beside an alternative inside an OR: that alternative becomes
 * (it and the new term). A chip moved there (`from`) leaves its old place.
 */
export function andWith(query: string, to: { clause: number; term: number }, added: Term, from?: { clause: number; term: number }): string {
  const clauses = toClauses(query);
  const target = clauses[to.clause];
  if (!target || "raw" in target) return query;
  const host = target.terms[to.term];
  const all = [...(host.all ?? [host]), { raw: added.raw, neg: added.neg }];
  const holed: (Clause | undefined)[] = clauses.map((c, i) => {
    if ("raw" in c) return c;
    const terms = c.terms
      .map((t, j) => (i === to.clause && j === to.term ? { raw: group(all), neg: false, all } : t))
      .filter((_, j) => !(from && i === from.clause && j === from.term));
    return { terms };
  });
  return toQuery(holed.filter((c): c is Clause => !!c && ("raw" in c || c.terms.length > 0)));
}

/** Whether the query asks for this tag anywhere: alone, in an "or" group or inside an "and" in one. */
export function mentions(query: string, tag: string): boolean {
  const found = (t: Term): boolean => (!t.neg && same(t.raw, tag)) || (t.all ?? []).some(found);
  return toClauses(query).some((c) => !("raw" in c) && c.terms.some(found));
}
