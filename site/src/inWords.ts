import type { Clause, Term } from "./clauses";
import { namespaceOf } from "./search";

/** The words a query is read out with (i18n: says). */
export type Words = { lead: string; and: string; or: string; without: string; not: string; all: string };

/** Namespaces that only say what kind of thing a tag names: the name alone reads better. */
const KINDS = new Set(["product", "model", "company", "person", "tech", "mood", "format", "sponsor", "topic"]);

const name = (raw: string) => {
  const ns = namespaceOf(raw);
  if (ns === "text") return `«${raw.slice(ns.length + 1).replace(/^"|"$/g, "")}»`;
  return ns && KINDS.has(ns) ? raw.slice(ns.length + 1) : raw;
};

const term = (t: Term, w: Words): string =>
  t.all ? `(${t.all.map((part) => term(part, w)).join(` ${w.and} `)})` : `${t.neg ? `${w.not} ` : ""}${name(t.raw)}`;

/**
 * The query in one sentence: AND between chips, OR inside a group, a lone minus as "without"
 * at the end. Undefined for a query a chip already says by itself (one plain tag), or none.
 */
export function inWords(clauses: Clause[], w: Words): string | undefined {
  const plain = clauses.length === 1 && !("raw" in clauses[0]) && clauses[0].terms.length === 1 && !clauses[0].terms[0].neg && !clauses[0].terms[0].all;
  if (clauses.length === 0 || plain) return undefined;
  const wanted: string[] = [];
  const unwanted: string[] = [];
  for (const clause of clauses) {
    if ("raw" in clause) wanted.push(clause.raw);
    else if (clause.terms.length === 1 && clause.terms[0].neg && !clause.terms[0].all) unwanted.push(name(clause.terms[0].raw));
    else {
      const alternatives = clause.terms.map((t) => term(t, w));
      const group = alternatives.join(` ${w.or} `);
      wanted.push(alternatives.length > 1 && clauses.length > 1 ? `(${group})` : group);
    }
  }
  const head = wanted.length ? `${w.lead}: ${wanted.join(` ${w.and} `)}` : w.all;
  return unwanted.length ? `${head}${wanted.length ? "," : ""} ${w.without} ${unwanted.join(", ")}` : head;
}
