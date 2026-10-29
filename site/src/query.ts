/**
 * Derpibooru-style query syntax, parsed into a tree. Terms stay raw strings; search.ts
 * decides what a term means.
 *
 *   opus, -codex                 AND with a comma (or &&, AND), NOT with - (or !, NOT)
 *   mood:hype || mood:salty      OR with || (or OR), parentheses group
 *   person:*  "thundering herd"  wildcards, quoted phrases
 */

export type Query =
  | { op: "and" | "or"; children: Query[] }
  | { op: "not"; child: Query }
  | { op: "term"; raw: string };

export function tokenize(query: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < query.length) {
    const rest = query.slice(i);
    const space = rest.match(/^\s+/);
    if (space) {
      i += space[0].length;
      continue;
    }
    const operator = rest.match(/^(\|\||&&|,|\(|\)|(?:NOT|OR|AND)(?=\s)|[-!](?=\S))/);
    if (operator) {
      tokens.push(operator[1]);
      i += operator[1].length;
      continue;
    }
    if (rest.startsWith('"')) {
      const end = rest.indexOf('"', 1);
      const phrase = end === -1 ? rest : rest.slice(0, end + 1);
      tokens.push(phrase);
      i += phrase.length;
      continue;
    }
    // a term runs to the next operator; tags may contain spaces only inside quotes
    const word = rest.match(/^.+?(?=\s*(?:\|\||&&|,|\)|\s(?:OR|AND)\s)|$)/)![0];
    tokens.push(word.trim());
    i += Math.max(word.length, 1);
  }
  return tokens;
}

export function parseQuery(query: string): Query | undefined {
  const tokens = tokenize(query);
  let index = 0;
  const peek = () => tokens[index];
  const isOr = (token?: string) => token === "||" || token === "OR";
  const isAnd = (token?: string) => token === "," || token === "&&" || token === "AND";

  function or(): Query | undefined {
    const children = [and()].filter((node): node is Query => !!node);
    while (isOr(peek())) {
      index++;
      const next = and();
      if (next) children.push(next);
    }
    return children.length > 1 ? { op: "or", children } : children[0];
  }
  function and(): Query | undefined {
    const children = [not()].filter((node): node is Query => !!node);
    while (isAnd(peek())) {
      index++;
      const next = not();
      if (next) children.push(next);
    }
    return children.length > 1 ? { op: "and", children } : children[0];
  }
  function not(): Query | undefined {
    const token = peek();
    if (token === "-" || token === "!" || token === "NOT") {
      index++;
      const child = not();
      return child && { op: "not", child };
    }
    return atom();
  }
  function atom(): Query | undefined {
    const token = peek();
    if (token === undefined || token === ")" || isOr(token) || isAnd(token)) return undefined;
    index++;
    if (token === "(") {
      const inner = or();
      if (peek() === ")") index++;
      return inner;
    }
    return { op: "term", raw: token };
  }

  return or();
}

/** The term being typed at the end of the query, for autocomplete. */
export function lastTerm(query: string): { start: number; text: string } {
  const match = query.match(/(?:^|,|\|\||&&|\()\s*(?:-|!|NOT\s+)?([^,|&()]*)$/);
  const text = match?.[1] ?? "";
  return { start: query.length - text.length, text };
}

