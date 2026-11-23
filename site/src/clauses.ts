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

/** A term without the tag: gone if it is the tag, an "and" group without that part of it. */
function dropTerm(t: Term, tag: string): Term | undefined {
  if (same(t.raw, tag)) return undefined;
  if (!t.all) return t;
  const all = t.all.filter((part) => !same(part.raw, tag));
  if (all.length === t.all.length) return t;
  if (all.length === 0) return undefined;
  return all.length === 1 ? all[0] : { raw: group(all), neg: t.neg, all };
}

function without(clauses: Clause[], tag: string): Clause[] {
  return clauses
    .map((c) => ("raw" in c ? c : { terms: c.terms.flatMap((t) => dropTerm(t, tag) ?? []) }))
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

/** Where a chip is: its clause, its term, and for one part of an "and" group inside an OR, that part. */
export type At = { clause: number; term: number; part?: number };

/** Clauses while a term is being moved: its old place is a hole until the move is done. */
type Slot = { raw: string } | { terms: (Term | undefined)[] };

const settle = (slots: Slot[]): Clause[] =>
  slots
    .map((s) => ("raw" in s ? s : { terms: s.terms.filter((t): t is Term => !!t) }))
    .filter((c) => "raw" in c || c.terms.length > 0);

/** An "and" group of these parts; one part left is a plain term again. */
const andTerm = (all: Term[]): Term => (all.length === 1 ? all[0] : { raw: group(all), neg: false, all });

/**
 * Takes the term at `at` out, leaving a hole so indices into the clauses stay right. A part
 * leaves the rest of its group in place, so even its own term keeps its index.
 */
function lift(clauses: Clause[], at: At): { moved?: Term; slots: Slot[] } {
  let moved: Term | undefined;
  const slots = clauses.map((c, i): Slot => {
    if ("raw" in c || i !== at.clause) return c;
    return {
      terms: c.terms.map((t, j) => {
        if (j !== at.term) return t;
        if (at.part === undefined || !t.all) {
          moved = t;
          return undefined;
        }
        moved = t.all[at.part];
        return andTerm(t.all.filter((_, k) => k !== at.part));
      }),
    };
  });
  return { moved, slots };
}

/** A chip dragged inside the search box: out of its place and into another. */
export function moveTerm(query: string, from: At, to: Drop): string {
  const { moved, slots } = lift(toClauses(query), from);
  if (!moved) return query;
  if ("join" in to) {
    const target = slots[to.join];
    if (target && !("raw" in target)) slots[to.join] = { terms: [...target.terms, moved] };
  } else {
    slots.splice(to.before, 0, { terms: [moved] });
  }
  return toQuery(settle(slots));
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
export function editTerm(query: string, at: At, change: "negate" | "remove"): string {
  const clauses = toClauses(query);
  if (change === "remove") return toQuery(settle(lift(clauses, at).slots));
  const flip = (t: Term) => ({ ...t, neg: !t.neg });
  return toQuery(
    clauses.map((c, i) => {
      if (i !== at.clause || "raw" in c) return c;
      return {
        terms: c.terms.map((t, j) => {
          if (j !== at.term) return t;
          if (at.part === undefined || !t.all) return flip(t);
          return andTerm(t.all.map((part, k) => (k === at.part ? flip(part) : part)));
        }),
      };
    }),
  );
}

/** Whether the query excludes this tag on its own (`-tag` as a clause). */
export function excludesTag(query: string, tag: string): boolean {
  return toClauses(query).some((c) => !("raw" in c) && c.terms.length === 1 && c.terms[0].neg && same(c.terms[0].raw, tag));
}

/**
 * A term dropped on the "and" tab over an alternative inside an OR: that alternative becomes
 * (it and the new term): a tag from the page, or a chip that leaves its old place (`from`).
 */
export function andWith(query: string, to: { clause: number; term: number }, what: { term: Term } | { from: At }): string {
  const clauses = toClauses(query);
  let slots: Slot[] = clauses;
  let added: Term;
  if ("from" in what) {
    const lifted = lift(clauses, what.from);
    if (!lifted.moved) return query;
    slots = lifted.slots;
    added = lifted.moved;
  } else {
    added = what.term;
  }
  const target = slots[to.clause];
  const host = target && !("raw" in target) ? target.terms[to.term] : undefined;
  if (!target || "raw" in target || !host) return query;
  const all = [...(host.all ?? [host]), ...(added.all && !added.neg ? added.all : [{ raw: added.raw, neg: added.neg }])];
  slots[to.clause] = { terms: target.terms.map((t, j) => (j === to.term ? andTerm(all) : t)) };
  return toQuery(settle(slots));
}

/** Whether the query asks for this tag anywhere: alone, in an "or" group or inside an "and" in one. */
export function mentions(query: string, tag: string): boolean {
  const found = (t: Term): boolean => (!t.neg && same(t.raw, tag)) || (t.all ?? []).some(found);
  return toClauses(query).some((c) => !("raw" in c) && c.terms.some(found));
}

/** Whether the query has this tag anywhere, asked for or excluded. */
export function uses(query: string, tag: string): boolean {
  const found = (t: Term): boolean => same(t.raw, tag) || (t.all ?? []).some(found);
  return toClauses(query).some((c) => !("raw" in c) && c.terms.some(found));
}
