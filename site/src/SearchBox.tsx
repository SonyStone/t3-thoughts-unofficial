import { createEffect, createMemo, createSignal, flush, For, onSettled, Show, untrack } from "solid-js";
import { andWith, applyTag, dropTag, editTerm, excludesTag, moveTerm, toClauses, toQuery, uses, type At, type Clause, type Drop, type Term } from "./clauses";
import { draggable, dragged, onDrop, over, still, type Dragged } from "./drag";
import { t } from "./i18n";
import { Icon } from "./icons";
import { inWords } from "./inWords";
import { changingHere, currentQuery, openScreen, route, setQuery } from "./route";
import { tokenize } from "./query";
import { scrollBehavior } from "./motion";
import { readingTop } from "./scroll";
import { knowsTerm, suggest, textTerm } from "./search";
import { namespaceKey, TagLabel } from "./Tag";
import TagCloud from "./TagCloud";
import { menuTrigger, openAt, openTagMenu } from "./TagMenu";

/** Where a dragged tag or chip can land: a place among the chips, or one of the big zones. */
type Target = Drop | "negate" | "remove" | "only" | { andWith: { clause: number; term: number } };

/**
 * A phone, upright or on its side (wide then, but short, and the keyboard takes most of it):
 * there editing the search is a screen of its own (see `editing`).
 */
const PHONE = window.matchMedia("(max-width: 700px), (pointer: coarse) and (max-height: 500px)");

/**
 * How far from an end of the row of chips the row keeps a chip or the caret it scrolls to:
 * clear of the fade there and of the arrow over it (`.chips` has it as its scroll padding).
 */
const ROW_EDGE = 40;

/** The editing screen's height under which the bar, the docked zones and two rows of tags do not fit. */
const SHORT_VIEW = 220;

/** A space ends a term unless it sits inside an open quote. */
const openQuote = (text: string) => (text.match(/"/g)?.length ?? 0) % 2 === 1;

/** Text with query syntax in it (`||`, `OR`, brackets...): it goes in as a query, not as words to find. */
const OPERATORS = new Set(["||", "&&", "(", ")", "OR", "AND", "NOT"]);
const hasSyntax = (text: string) => tokenize(text).some((token) => OPERATORS.has(token));

/** The terms typed, as the query reads them: quotes keep a phrase (or text:"…") one term, a comma parts terms as a space does. */
function termsOf(text: string): string[] {
  const terms: string[] = [];
  let sign = "";
  for (const token of tokenize(text)) {
    if (token === ",") continue;
    if (token === "-" || token === "!") sign = token;
    else {
      terms.push(sign + token);
      sign = "";
    }
  }
  return terms;
}

/** Nothing to search for: a lone minus, an operator, empty quotes (a quoted "NOT" is a word to find). */
const blank = (text: string) =>
  !termsOf(text).some((term) => {
    const bare = term.replace(/^[-!]/, "");
    return !OPERATORS.has(bare) && !/^[|&]+$/.test(bare) && !!bare.replace(/"/g, "").trim();
  });

/**
 * The query with typed syntax added: `|| ui` typed after a chip joins it as an alternative (the
 * space after a known word has already made it a chip), the chip right before the caret (`at`
 * chips stand before it); anything else adds clauses, which `insert` then moves to the caret.
 */
function withSyntax(query: string, text: string, at: number): string {
  const lead = /^(?:(\|\||OR\s)|&&|AND\s)\s*/.exec(text);
  const rest = lead ? text.slice(lead[0].length) : text;
  const list = toClauses(query);
  if (lead?.[1] && at > 0) {
    const joined = toClauses(`(${toQuery([list[at - 1]])}) || (${rest})`);
    return toQuery([...list.slice(0, at - 1), ...joined, ...list.slice(at)]);
  }
  return toQuery([...list, ...toClauses(rest)]);
}

/** Whether the query has this tag with this sign (not just the tag, as `uses` tells). */
function hasTerm(query: string, tag: string, neg: boolean): boolean {
  const found = (t: Term): boolean => (t.neg === neg && t.raw.toLowerCase() === tag.toLowerCase()) || (t.all ?? []).some(found);
  return toClauses(query).some((c) => !("raw" in c) && c.terms.some(found));
}

/** The search moved to another place on the page (App: oneSearch): the blur that comes with it is not a leaving. */
let moving = false;
export function moveSearch(move: () => void) {
  moving = true;
  try {
    move();
  } finally {
    moving = false;
  }
}

/**
 * Whether the keys moved the focus last, not a press: Tab may then go to chips, tags and menus.
 * Noted before any other key handler (a menu's arrows move the focus in theirs), so from here.
 */
let byKeys = false;
window.addEventListener("keydown", () => (byKeys = true), true);
window.addEventListener("pointerdown", () => (byKeys = false), true);

/** The shortcut that focuses the search, as this keyboard has it. */
const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * The search box: the query as chips (AND between chips, OR inside a group), then a text
 * field with tag autocomplete. A space or Enter turns the text into a chip, Backspace on an
 * empty field takes the chip before the caret back, a chip click opens the tag menu. Chips
 * and tags from the page can be dragged in (drag.ts): between chips (its own chip there), onto
 * the middle of a chip (an "or" with it), onto the zones of the box, onto the "and" tab over an
 * alternative in an "or" group; a chip let go off the box leaves the query.
 * `/` and ⌘K focus it from anywhere. Focusing it shows the tag cloud in a dropdown (the page
 * has none of its own).
 */
export default function SearchBox() {
  let input: HTMLInputElement | undefined;
  let root: HTMLDivElement | undefined;
  /** The one row of chips; what does not fit scrolls sideways. */
  let row: HTMLSpanElement | undefined;
  const outside = (x: number, y: number) => {
    const box = root?.getBoundingClientRect();
    return !box || x < box.left || x > box.right || y < box.top || y > box.bottom;
  };
  const [draft, setDraft] = createSignal("");
  const [focused, setFocused] = createSignal(false);
  const [active, setActive] = createSignal(0);

  // a clause the new query still has keeps its object, so its chip (and the focus on it) stays
  const clauses = createMemo((prev: Clause[] | undefined) => {
    const next = toClauses(route().q);
    if (!prev) return next;
    const left = new Map<string, Clause[]>();
    for (const clause of prev) {
      const key = toQuery([clause]);
      left.set(key, [...(left.get(key) ?? []), clause]);
    }
    return next.map((clause) => left.get(toQuery([clause]))?.shift() ?? clause);
  });
  // tags for one word; the words themselves as a text search, last, for anything that is not all
  // tags; a term the search knows (a field, kind:reply) stays as it is, and a quoted phrase is text
  const options = createMemo((): [string, number][] => {
    const value = draft().trim();
    if (!focused() || !value || blank(value) || hasSyntax(value)) return [];
    const words = termsOf(value);
    if (words.length > 1) return words.every(knowsTerm) ? [] : [[textTerm(value), -1]];
    const tags = suggest(value.replace(/^[-!]/, ""));
    return knowsTerm(value) && !/^[-!]?"/.test(value) ? tags : [...tags, [textTerm(value), -1]];
  });
  /**
   * On a phone, the search being edited is a screen of its own: the box at the top, the tags
   * under it down to the keyboard, the page frozen behind. It stays until Done or Escape, not
   * until the field loses focus: a chip tapped for its menu takes the focus, and a keyboard put
   * away still leaves the tags to pick from.
   */
  const [editing, setEditing] = createSignal(false);
  /** Where the page was when the field was pressed, before the browser scrolled it into view. */
  let pressedAt: number | undefined;
  const startEditing = () => {
    if (PHONE.matches && !editing()) setEditing(true);
  };
  /**
   * A chip tapped (or held and let go): its menu. On a phone not editing yet, the editing
   * screen instead: the chips leave the box no free room to tap, and the menu belongs there.
   */
  const chipMenu = (event: MouseEvent | undefined, tag: string, el?: HTMLElement, x = 0, y = 0) => {
    if (PHONE.matches && !editing()) {
      event?.preventDefault();
      event?.stopPropagation();
      input?.focus();
    } else if (event) openTagMenu(event, tag);
    else openAt(el ?? null, tag, x, y);
  };

  /** Set while the editing screen is being closed (Done, Escape, Back). */
  let leaving = false;
  /** A tag or chip: what a finger presses to pick up or open a menu, never to type in. */
  const grabs = (el: HTMLElement) => !!el.closest(".tag, .chip, .part");
  const stopEditing = () => {
    rewind = true;
    setWithin(false);
    // a leaving, whatever was pressed last (a tag, a chip's menu): the field does not take the focus back
    leaving = true;
    try {
      input?.blur();
    } finally {
      leaving = false;
    }
    // the focus was on a chip's menu: the text in the field goes in all the same
    commit(draft());
    setEditing(false);
  };
  // the phone turned (or the window changed size) with the search in use: the screen opens or
  // goes to match, and the field keeps the focus
  // (in the middle of a drag, the screen waits for the drop: the zones under the finger stay)
  let turnLater = false;
  const turned = () => {
    if (dragged()) {
      turnLater = true;
      return;
    }
    const typing = !!input && document.activeElement === input;
    if (PHONE.matches) {
      if (typing) startEditing();
    } else if (editing()) {
      if (!typing) rewind = true;
      setEditing(false);
    }
  };
  createEffect(
    () => !!dragged(),
    (on) => {
      if (on || !turnLater) return;
      turnLater = false;
      queueMicrotask(turned);
    },
  );
  onSettled(() => {
    PHONE.addEventListener("change", turned);
    return () => PHONE.removeEventListener("change", turned);
  });
  /**
   * Set when the search is left (Done, a tap or Tab away): the row of chips goes back to its
   * start then, so the page shows the query from its first chip, not from where the caret was.
   * Not when the focus goes to a chip or an arrow of the box: that is still working on it.
   */
  let rewind = false;
  /** Whether the last press was on the box: the focus then moves within it, even with no relatedTarget. */
  let pressedInBox = false;
  /** What the last press was on: a chip without the focus (a part of a group) says so only here. */
  let pressed: Element | undefined;
  /**
   * The focus is in the dropdown or on a menu opened from it, with the keys: a tag of the cloud whose
   * menu is open, or gets the focus back from it, keeps the cloud it is in.
   */
  const [within, setWithin] = createSignal(false);
  /** Focus there keeps the cloud open: the cloud itself, and Clear, which Tab passes on the way to it. */
  const holds = (to: Element | null) => !!to && !!root?.contains(to) && !!to.closest(".search-drop, .search-clear");
  // a menu of a tag of the cloud, with the focus in it, closed by a press elsewhere (or a drag out
  // of it ending): the focus went nowhere, which no focusout says, and the cloud goes with it
  createEffect(
    () => !!menuTrigger(),
    (open) => {
      if (open) return;
      // (another menu opened in its place, or a press in the cloud closed it: the cloud is in use)
      requestAnimationFrame(() => {
        const at = document.activeElement;
        if (untrack(within) && !untrack(menuTrigger) && !(!byKeys && holds(pressed ?? null)) && !holds(at) && !at?.closest(".tag-menu")) setWithin(false);
      });
    },
  );
  // the page has no tag cloud of its own: a search being worked on shows it, stuck or not
  const showCloud = () => !draft().trim() && (focused() || editing() || within());

  /** Known terms become chips of their own; anything else is one text search chip. */
  /**
   * The caret among the chips: how many clauses stand before the text field. Arrows move it,
   * new terms go in there. Undefined means after the last chip.
   */
  const [caret, setCaret] = createSignal<number | undefined>();
  const caretAt = () => Math.min(caret() ?? clauses().length, clauses().length);

  /** Sets a query whose new clauses were added at the end, moving them to the caret. */
  const insert = (next: string) => {
    const at = caret();
    const before = toClauses(currentQuery()).length;
    const list = toClauses(next);
    const added = Math.max(0, list.length - before);
    if (at === undefined || added === 0 || at >= list.length - added) {
      setQuery(next);
      return;
    }
    const tail = list.splice(list.length - added, added);
    list.splice(at, 0, ...tail);
    setQuery(toQuery(list));
    setCaret(at + added);
  };

  /** Known terms become chips of their own; anything else is one text search chip. */
  const commit = (text: string) => {
    const value = text.trim().replace(/,$/, "").trim();
    if (!value) return;
    const q = currentQuery();
    if (blank(value) || hasSyntax(value)) {
      if (!blank(value)) {
        // against the query as it is now: chips typed a moment ago may not be in the address yet
        const count = toClauses(q).length;
        insert(withSyntax(q, value, Math.min(caret() ?? count, count)));
      }
      setDraft("");
      setActive(0);
      return;
    }
    const words = termsOf(value);
    if (!words.every(knowsTerm)) {
      pick(textTerm(value));
      return;
    }
    // each known word as a pick from the list: one already there stays, its opposite flips
    for (const word of words) putTerm(word);
    setDraft("");
    setActive(0);
  };

  /**
   * A click toggles a used suggestion. Accepting it from the keyboard keeps it as it is, or turns
   * it the way it was typed (`-agents` over `agents` excludes it).
   */
  const pick = (term: string, toggle = false) => {
    putTerm(/^[-!]/.test(draft()) && !/^[-!]/.test(term) ? `-${term}` : term, toggle);
    setDraft("");
    setActive(0);
  };

  /** One term into the query, its sign its own (see `pick`). */
  const putTerm = (term: string, toggle = false) => {
    const negate = /^[-!]/.test(term);
    const tag = term.replace(/^[-!]/, "");
    const q = currentQuery();
    const there = hasTerm(q, tag, negate);
    const action = toggle ? (negate ? (there ? "remove" : "exclude") : uses(q, tag) ? "remove" : "and") : there ? undefined : negate ? "exclude" : "and";
    if (action) insert(applyTag(q, tag, action));
  };

  /** Takes a chip next to the caret back out of the query. */
  const removeAt = (index: number) => setQuery(toQuery(toClauses(currentQuery()).filter((_, i) => i !== index)));

  const onKeyDown = (event: KeyboardEvent) => {
    // an IME composing: its Enter, Space and comma pick a candidate, they do not end a term
    if (event.isComposing || event.keyCode === 229) return;
    fromList = undefined;
    const list = options();
    if (event.key === "Escape") {
      stopEditing();
    } else if (event.key === "Backspace" && !draft() && caretAt() > 0) {
      // the chip before the caret comes back as text
      event.preventDefault();
      const index = caretAt() - 1;
      const chip = toClauses(currentQuery())[index];
      removeAt(index);
      setCaret(caret() === undefined ? undefined : index);
      setDraft(asDraft(chip));
    } else if (event.key === "Delete" && !draft() && caretAt() < clauses().length) {
      event.preventDefault();
      removeAt(caretAt());
    } else if (event.key === "ArrowLeft" && input?.selectionStart === 0 && input.selectionEnd === 0 && caretAt() > 0) {
      event.preventDefault();
      setCaret(caretAt() - 1);
    } else if (event.key === "ArrowRight" && input?.selectionStart === draft().length && caretAt() < clauses().length) {
      event.preventDefault();
      const next = caretAt() + 1;
      setCaret(next >= clauses().length ? undefined : next);
    } else if (list.length > 0 && event.key === "ArrowDown") {
      event.preventDefault();
      setActive((active() + 1) % list.length);
    } else if (list.length > 0 && event.key === "ArrowUp") {
      event.preventDefault();
      setActive((active() - 1 + list.length) % list.length);
    } else if (list.length > 0 && (event.key === "Enter" || (event.key === "Tab" && !event.shiftKey))) {
      event.preventDefault();
      pick(list[Math.min(active(), list.length - 1)][0]);
    } else if (event.key === "Enter" || endsTerm(event.key, draft())) {
      event.preventDefault();
      commit(draft());
    }
  };

  /**
   * A chip taken back into the field, as it would be typed: a text search as its words (in
   * quotes when they would read as tags), anything else as its query.
   */
  const asDraft = (chip: Clause) => {
    if ("raw" in chip) return chip.raw;
    const query = toQuery([chip]);
    const text = /^(-?)text:(?:"([^"]*)"|(\S+))$/.exec(query);
    if (!text) return query;
    const [, neg, quoted, bare] = text;
    const words = quoted ?? bare;
    return words.split(/\s+/).every(knowsTerm) ? `${neg}"${words}"` : `${neg}${words}`;
  };

  const isOneKnownWord = (text: string) => /^\S+$/.test(text.trim()) && !openQuote(text) && knowsTerm(text);
  /** Typed syntax that is whole (`|| ui`, `(a b)`): a space after it takes it in, as after a known word. */
  const isWholeSyntax = (text: string) => {
    if (!hasSyntax(text) || openQuote(text)) return false;
    const tokens = tokenize(text);
    const last = tokens.at(-1)!;
    const depth = tokens.filter((token) => token === "(").length - tokens.filter((token) => token === ")").length;
    return depth === 0 && (last === ")" || (!OPERATORS.has(last) && knowsTerm(last)));
  };
  const endsTerm = (key: string, text: string) => key === "," ? !openQuote(text) && !hasSyntax(text) : key === " " && (isOneKnownWord(text) || isWholeSyntax(text));

  /**
   * The suggestion last pressed: dragged into the search or held for its menu, it changes the
   * query without a pick, and what was typed to find it goes then as after a pick.
   */
  let fromList: string | undefined;
  createEffect(
    () => route().q,
    () => {
      if (fromList === undefined) return;
      fromList = undefined;
      setDraft("");
      setActive(0);
    },
    { defer: true },
  );
  /** The query as the last press began: a drag that ends with it unchanged was let go of, not used. */
  let dragFrom: string | undefined;
  createEffect(
    () => !!dragged(),
    (on) => {
      if (!on && dragFrom !== undefined && untrack(currentQuery) === dragFrom) fromList = undefined;
    },
  );

  const onInput = (event: InputEvent & { currentTarget: HTMLInputElement }) => {
    fromList = undefined;
    const field = event.currentTarget;
    const end = field.selectionEnd;
    // A phone keyboard can insert the separator without sending its keydown.
    if (!event.isComposing && event.inputType === "insertText" && (event.data === " " || event.data === ",") && end !== null) {
      const text = field.value.slice(0, end - 1) + field.value.slice(end);
      if (endsTerm(event.data, text)) {
        field.value = text;
        commit(text);
        return;
      }
    }
    setDraft(field.value);
    setActive(0);
  };

  const place = (what: Dragged, to: Target) => {
    const at = carried();
    const q = currentQuery();
    if (typeof to === "object" && "andWith" in to) {
      if (what.kind === "tag" && !at) setQuery(andWith(q, to.andWith, { term: { raw: what.tag, neg: false } }));
      else if (at) setQuery(andWith(q, to.andWith, { from: at }));
      return;
    }
    // a tag from the page that is already in the search moves that chip, like a chip would
    if (what.kind === "tag" && !at) {
      if (to === "remove") return;
      if (to === "only") setQuery(what.tag);
      else setQuery(to === "negate" ? applyTag(q, what.tag, "exclude") : dropTag(q, what.tag, to));
      return;
    }
    if (!at) return;
    // a raw chip (a query too nested for chips) can only go, stand alone or be negated
    if (at.term < 0) {
      const raw = (clauses()[at.clause] as { raw: string }).raw;
      if (to === "remove") setQuery(toQuery(clauses().filter((_, i) => i !== at.clause)));
      else if (to === "only") setQuery(raw);
      else if (to === "negate") setQuery(toQuery(clauses().map((c, i) => (i === at.clause ? { raw: raw.startsWith("-") ? raw.slice(1) : `-${raw}` } : c))));
      return;
    }
    const host = (clauses()[at.clause] as { terms: Term[] }).terms[at.term];
    const term = at.part === undefined ? host : host.all![at.part];
    if (to === "only") setQuery(`${term.neg ? "-" : ""}${term.raw}`);
    else setQuery(to === "negate" || to === "remove" ? editTerm(q, at, to) : moveTerm(q, at, to));
  };

  /**
   * The chip in the search that is being carried: a chip dragged out of it, or a tag from
   * the page that the search already has. It stays behind, dimmed, until the drop; let go on
   * it, nothing changes.
   */
  const carried = createMemo((): At | undefined => {
    const what = dragged();
    if (!what) return undefined;
    if (what.kind === "chip") return { clause: what.clause, term: what.term, part: what.part };
    const same = (each: Term) => each.raw.toLowerCase() === what.tag.toLowerCase();
    for (const [index, clause] of clauses().entries()) {
      if ("raw" in clause) continue;
      for (const [term, each] of clause.terms.entries()) {
        if (same(each)) return { clause: index, term };
        const part = each.all?.findIndex(same) ?? -1;
        if (part >= 0) return { clause: index, term, part };
      }
    }
    return undefined;
  });
  /** The whole chip is carried (not one part of its "and" group). */
  const isCarried = (clause: number, term: number) => carried()?.clause === clause && carried()?.term === term && carried()?.part === undefined;
  const isCarriedPart = (clause: number, term: number, part: number) =>
    carried()?.clause === clause && carried()?.term === term && carried()?.part === part;
  /** Joining a chip with "or" means something only for chips other than the carried one's own group (a part may leave its "and" for it). */
  const canJoin = (index: number) => !!dragged() && (carried()?.clause !== index || carried()?.part !== undefined);

  /** A group that is still an "or" with the carried chip gone from it: its alternatives get "and" tabs. */
  const staysOr = (index: number) => {
    const clause = clauses()[index];
    if (!dragged() || !clause || "raw" in clause) return false;
    return clause.terms.length - (carried()?.clause === index && carried()?.part === undefined ? 1 : 0) > 1;
  };

  const carriedGroupSize = () => {
    const at = carried();
    const clause = at && clauses()[at.clause];
    return clause && !("raw" in clause) ? clause.terms.length : 0;
  };
  /** The carried chip has a minus: "Without" would take it off. */
  const carriedNeg = () => {
    const at = carried();
    const clause = at && clauses()[at.clause];
    if (!at || !clause) return false;
    if ("raw" in clause) return clause.raw.startsWith("-");
    const term = clause.terms[at.term];
    return !!(at.part === undefined ? term?.neg : term?.all?.[at.part]?.neg);
  };

  // only the zones that would change something
  const showAdd = () => !carried() || (carried()!.term >= 0 && carriedGroupSize() > 1);
  const showOnly = () => clauses().length > (carried() && carriedGroupSize() === 1 ? 1 : 0);

  // every drop place by its key (data-drop), so the drag can tell what it was let go on
  const targets = new Map<string, Target>();
  const target = (key: string, to: Target) => (targets.set(key, to), { "data-drop": key });

  /** A chip's name for sliding it from where it stood: the same tag before and after a change, whatever remounted it. */
  const flipKey = (term: Term) => (term.all ? `(${term.all.map((part) => part.raw).join(" ")})` : term.raw).toLowerCase();
  /** A group slides as one when it is the same group; its chips ride along. */
  const clauseKey = (terms: Term[]) => `clause:${terms.map(flipKey).join(" || ")}`;

  /** Where each chip stands, in the row's own coordinates, so the row may scroll in between. */
  const measure = () => {
    const at = new Map<string, { el: Element; x: number; y: number }>();
    if (!row || !root) return at;
    const left = row.getBoundingClientRect().left - row.scrollLeft;
    // the row reaches over and under the box while dragging; the box itself stays put
    const top = root.getBoundingClientRect().top;
    const seen = new Map<string, number>();
    for (const el of row.querySelectorAll<HTMLElement>("[data-flip]")) {
      const name = el.dataset.flip!;
      const n = seen.get(name) ?? 0;
      seen.set(name, n + 1);
      const box = el.getBoundingClientRect();
      at.set(`${name}#${n}`, { el, x: box.left - left, y: box.top - top });
    }
    return at;
  };

  /** Notes where the chips stand; what it returns slides them from there to where they stand now (FLIP). */
  const snapshot = () => {
    if (still.matches) return () => {};
    const before = measure();
    return (keep?: Element) => {
      const moved = new Map<Element, { x: number; y: number }>();
      for (const [name, now] of measure()) {
        const was = before.get(name);
        if (!was) {
          // a group the change made: its frame and its words fade in around chips sliding into it
          if (now.el.matches(".chip-group")) now.el.animate([{ borderColor: "transparent" }, {}], { duration: 200, easing: "ease-out" });
          for (const word of now.el.querySelectorAll(":scope > .chip-op")) word.animate([{ opacity: 0 }, { opacity: 0, offset: 0.4 }, {}], { duration: 220 });
          continue;
        }
        const shift = { x: was.x - now.x, y: was.y - now.y };
        moved.set(now.el, shift);
        if (now.el === keep) continue;
        // a part rides along with its group: only what it moves inside the group is its own
        const group = now.el.parentElement?.closest("[data-flip]");
        const carry = (group && moved.get(group)) || { x: 0, y: 0 };
        const x = shift.x - carry.x;
        const y = shift.y - carry.y;
        if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) continue;
        now.el.animate([{ translate: `${x}px ${y}px` }, { translate: "0 0" }], { duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" });
      }
    };
  };

  /** A chip a drop just made: the row scrolls it into view, and the copy lands on it. */
  const landOn = (name: string) => {
    const key = name.toLowerCase().replace(/^-/, "");
    const el = row?.querySelector(`[data-flip="${CSS.escape(key)}"], [data-flip="${CSS.escape(`raw:${key}`)}"], [data-flip="${CSS.escape(`raw:-${key}`)}"]`);
    if (el) reveal(el);
    return el;
  };
  /**
   * Where the dragged tag would stand as a chip of its own, while it is over the chips or the
   * "Add" zone: a preview of it opens there, and a drop on the chips puts it there.
   */
  const [insertAtNow, setInsertAt] = createSignal<number | undefined>();
  // read only while something is dragged: the drag's end clears them a moment later, not in the
  // same update that ends it (an effect writing back into it would run its readers twice)
  const insertAt = () => (dragged() ? insertAtNow() : undefined);
  /**
   * The group the dragged tag would join with "or", while it is over the middle of a chip: the
   * group's frame and a preview of the tag open around that chip.
   */
  const [joinAtNow, setJoinAt] = createSignal<number | undefined>();
  const joinAt = () => (dragged() ? joinAtNow() : undefined);
  /** What the preview shows: the dragged tag as its chip would look. */
  const preview = () => {
    const what = dragged();
    if (!what) return undefined;
    return what.kind === "tag" ? { raw: what.tag, neg: over() === "negate" } : { raw: what.raw, neg: what.neg !== (over() === "negate") };
  };

  /**
   * What a drop at `x` would do on the chips: join the group under the pointer (its middle), or
   * open a gap between chips (before the first whose middle is right of `x`). Read as if no
   * preview were open, and from where the chips stand, not where their slide has got to:
   * otherwise opening a preview would move the answer and it would flip back and forth.
   */
  const aimAt = (x: number): { gap?: number; join?: number } => {
    if (!row) return { gap: clauses().length };
    const open = insertAt();
    const joined = joinAt();
    // offsets too: a preview that has just opened is still scaling up
    const width = (el: HTMLElement | null, gap: number) => (el ? el.offsetWidth + gap : 0);
    const room = width(row.querySelector<HTMLElement>(":scope > .slot"), 8);
    const grown = width(row.querySelector<HTMLElement>(".join-preview"), 6);
    // the row is the chips' offset parent: their offsets are where they stand, whatever slides
    const origin = row.getBoundingClientRect().left + row.clientLeft - row.scrollLeft;
    let gap = 0;
    let join: number | undefined;
    [...row.querySelectorAll<HTMLElement>(":scope > .clause, :scope > .chip.raw")].forEach((el, index) => {
      let left = origin + el.offsetLeft;
      let right = left + el.offsetWidth;
      if (open !== undefined && index >= open) [left, right] = [left - room, right - room];
      if (joined !== undefined && index > joined) [left, right] = [left - grown, right - grown];
      if (index === joined) right -= grown;
      // the ends of a chip are for the gaps beside it
      const edge = Math.min(18, (right - left) / 4);
      if (el.matches(".clause") && canJoin(index) && x >= left + edge && x <= right - edge) join = index;
      if ((left + right) / 2 <= x) gap = index + 1;
    });
    return join !== undefined ? { join } : { gap };
  };

  /** Where a drop would open a gap or join a group, if it would change anything there. */
  const aim = (x: number, key = over()): { gap?: number; join?: number } => {
    const at = carried();
    // a query too nested for chips only goes, stands alone or is negated
    if (at && at.term < 0) return {};
    if (key === "add") return { gap: clauses().length };
    if (key === "negate" && !at) return { gap: clauses().length };
    // on a tab the preview stays open, empty: closing it would move the tab from under the pointer
    if (key?.startsWith("and-")) return { gap: insertAt(), join: joinAt() };
    if (key !== "field") return {};
    const found = aimAt(x);
    if (found.join !== undefined) return found;
    // right before or after a lone chip carried out of its own place: that is where it is already
    const clause = at && clauses()[at.clause];
    const alone = at && at.part === undefined && clause && !("raw" in clause) && clause.terms.length === 1;
    if (alone && (found.gap === at.clause || found.gap === at.clause + 1)) return {};
    return found;
  };

  /**
   * A zone that opened right under the pointer (the docked zones on a phone, under a tag picked
   * up low on the screen): it takes nothing until the pointer has left it once, so a picked-up
   * tag let go in place does not, say, keep only itself.
   */
  const [unarmedNow, setUnarmed] = createSignal<string | undefined>();
  const unarmed = () => (dragged() ? unarmedNow() : undefined);
  const lit = (key: string) => over() === key && unarmed() !== key;

  /** A drop shows where its chip went; the row does not jump to the text field after it. */
  let landing = false;

  /** Marks the sides of the row that have more chips past them, for the fades. */
  const markEdges = () => {
    if (!row) return;
    row.toggleAttribute("data-more-left", row.scrollLeft > 1);
    row.toggleAttribute("data-more-right", row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
  };

  /** Scrolls the row just enough to show `el` whole, ROW_EDGE in from the end it was past. */
  const reveal = (el: Element) => {
    if (!row) return;
    const box = row.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.right > box.right - ROW_EDGE) row.scrollLeft += r.right - (box.right - ROW_EDGE);
    else if (r.left < box.left + ROW_EDGE) row.scrollLeft -= box.left + ROW_EDGE - r.left;
    markEdges();
  };

  /** An arrow over an end of the row: a page of chips that way, as a tab bar's arrows do. */
  const page = (way: -1 | 1) => {
    if (!row) return;
    row.scrollBy({ left: way * Math.max(80, row.clientWidth - 2 * ROW_EDGE), behavior: scrollBehavior() });
  };

  // editing on a phone: the page stays where it was, under a screen as tall as what the
  // keyboard leaves (the visual viewport, which a fixed element does not follow by itself)
  createEffect(
    () => editing(),
    (on) => {
      if (!on || !root) return;
      const box = root;
      const y = pressedAt ?? window.scrollY;
      pressedAt = undefined;
      const { q: from, page: fromPage } = untrack(route);
      // the screen is a step in the history, which Back closes (route.ts); the page is noted
      // there where it was pressed, for the browser to put back to that place too
      window.scrollTo({ top: y, behavior: "instant" });
      const closeScreen = openScreen(stopEditing);
      const body = document.body.style;
      const was = body.cssText;
      Object.assign(body, { position: "fixed", top: `-${y}px`, left: "0", right: "0" });
      // focus that lands on a tag or chip here without leaving the field first (relatedTarget
      // can be missing) goes back to the field too
      const keep = (event: FocusEvent) => {
        const to = event.target as HTMLElement;
        if (!byKeys && box.contains(to) && grabs(to)) input?.focus({ preventScroll: true });
      };
      box.addEventListener("focusin", keep);
      // the screen covers the page: Tab goes round what is on it, in every browser (Safari's own
      // Tab skips buttons and would leave for a link under the screen)
      // (on the window, so after the field's own keys, which Solid hears on the document: Tab there may pick a suggestion)
      const tabbable = () =>
        [...box.querySelectorAll<HTMLElement>("input, button, a[href], [tabindex]")].filter(
          (el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0 && !el.closest("[inert], [aria-hidden='true']"),
        );
      const cycle = (event: KeyboardEvent) => {
        if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
        // a word being composed: Tab is the keyboard's own (as in the field's keys)
        if (event.isComposing || event.keyCode === 229) return;
        // from wherever it is: a chip's menu closed by this Tab gave the focus back to its chip,
        // one closed by Escape left it on the page under the screen
        const all = tabbable();
        if (!all.length) return;
        const at = all.indexOf(document.activeElement as HTMLElement);
        const next = at < 0 ? (event.shiftKey ? all.length - 1 : 0) : (at + (event.shiftKey ? -1 : 1) + all.length) % all.length;
        event.preventDefault();
        all[next].focus({ preventScroll: true });
        // a tag far down the cloud comes into its view (the page under the screen is held still)
        all[next].scrollIntoView({ block: "nearest", inline: "nearest" });
      };
      window.addEventListener("keydown", cycle);
      const view = window.visualViewport;
      const fit = () => {
        const height = view?.height ?? window.innerHeight;
        box.style.setProperty("--view-top", `${view?.offsetTop ?? 0}px`);
        box.style.setProperty("--view-height", `${height}px`);
        // too short for the bar, the zones and some tags (a phone on its side, the keyboard up):
        // the bar keeps its place and the zones give way to the tags (styles.css)
        box.toggleAttribute("data-short", height < SHORT_VIEW);
      };
      fit();
      view?.addEventListener("resize", fit);
      view?.addEventListener("scroll", fit);
      return () => {
        box.removeEventListener("focusin", keep);
        window.removeEventListener("keydown", cycle);
        view?.removeEventListener("resize", fit);
        view?.removeEventListener("scroll", fit);
        box.style.removeProperty("--view-top");
        box.style.removeProperty("--view-height");
        box.removeAttribute("data-short");
        body.cssText = was;
        // the query changed under the screen: the page goes to the start of the new results if it
        // was past them (the change itself could not scroll the frozen page), as a new query does
        // and opened from another page, the feed it went to opens at its results
        const feed = untrack(route).page === "feed";
        const changed = feed && untrack(currentQuery) !== from;
        const top = feed && fromPage !== "feed" ? readingTop() : changed ? Math.min(y, readingTop()) : y;
        window.scrollTo({ top, behavior: "instant" });
        closeScreen();
      };
    },
  );

  // the text field is where the caret is and where new chips go: the row keeps it in view
  let rowQuery = untrack(route).q;
  createEffect(
    () => [route().q, caretAt(), draft(), focused(), editing()],
    () => {
      requestAnimationFrame(() => {
        if (!row || !input) return;
        if (landing) {
          landing = false;
          markEdges();
          return;
        }
        const q = route().q;
        const seen = q === rowQuery;
        rowQuery = q;
        if (!focused() && !editing()) {
          // left: back to the first chip; not being worked on, the row stays where it is unless
          // the query changed (a tag clicked on the page), and then it shows the end, where it did
          if (rewind) {
            // the text left in the field is still on its way into the query: its run rewinds too
            rewind = currentQuery() !== q;
            row.scrollLeft = 0;
            markEdges();
            return;
          }
          if (seen) {
            markEdges();
            return;
          }
        }
        reveal(input);
      });
    },
    // a page opened on a query shows it from the start
    { defer: true },
  );

  // while something is dragged, holding it near an end of the row scrolls the chips past it
  createEffect(
    () => !!dragged(),
    (dragging) => {
      if (!dragging) return;
      landing = false;
      let x = -1;
      let y = -1;
      let frame = 0;
      // the tab nearest the pointer leans out to meet it
      let near: Element | undefined;
      let first = true;
      const track = (event: PointerEvent) => {
        x = event.clientX;
        y = event.clientY;
      };
      const step = () => {
        frame = requestAnimationFrame(step);
        if (!row) return;
        // the zones only: a chip moved a little along the chips is a move all the same
        if (first) setUnarmed(["add", "negate", "only"].includes(over() ?? "") ? over() : undefined);
        else if (unarmed() && over() !== unarmed()) setUnarmed(undefined);
        first = false;
        let best: Element | undefined;
        let bestDistance = 40;
        for (const tab of row.querySelectorAll(".or-tab, .and-tab")) {
          const r = tab.getBoundingClientRect();
          const distance = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
          if (distance < bestDistance) [best, bestDistance] = [tab, distance];
        }
        if (best !== near) {
          near?.removeAttribute("data-near");
          best?.setAttribute("data-near", "");
          near = best;
        }
        // the preview opens in the gap or the group under the pointer, its neighbours sliding apart
        const next = aim(x);
        if (next.gap !== insertAt() || next.join !== joinAt()) {
          const play = snapshot();
          setInsertAt(next.gap);
          setJoinAt(next.join);
          flush();
          play();
        }
        // the line of chips itself, not the tabs over and under it (a tag passes those on its way)
        const box = row.getBoundingClientRect();
        const style = getComputedStyle(row);
        const [top, bottom] = [box.top + parseFloat(style.paddingTop), box.bottom - parseFloat(style.paddingBottom)];
        if (y < top || y > bottom || x < box.left || x > box.right) return;
        const edge = 48;
        const speed = x < box.left + edge ? -(box.left + edge - x) : x > box.right - edge ? x - (box.right - edge) : 0;
        if (speed) {
          row.scrollLeft += speed / 4;
          markEdges();
        }
      };
      window.addEventListener("pointermove", track, true);
      frame = requestAnimationFrame(step);
      return () => {
        window.removeEventListener("pointermove", track, true);
        cancelAnimationFrame(frame);
        queueMicrotask(() => {
          setInsertAt(undefined);
          setJoinAt(undefined);
          setUnarmed(undefined);
        });
        near?.removeAttribute("data-near");
        markEdges();
      };
    },
  );

  /**
   * The dropdown ends inside the window: opened from the bar low on the page (the feed not yet
   * scrolled), it is as tall as the room under the bar, scrolling its tags in there, so none of
   * them stays out of reach below the window's edge. Opened with less room than that (a short
   * window), the page first moves up to make some; left with too little later (the page scrolled
   * back, the window made shorter), it opens upwards when there is more room over the bar.
   */
  const DROP_MIN = 240;
  /** When the field last got the focus from away (not back from Clear, a chip or its menu). */
  let enteredAt = 0;
  /** The focus or a press went off the box and its menus: the field is entered anew next time. */
  let away = true;
  const fitDrop = (opening = false) => {
    const drop = root?.querySelector<HTMLElement>(".search-drop");
    if (!drop || !root || editing()) return;
    const view = window.visualViewport?.height ?? window.innerHeight;
    // the gap over the dropdown and a margin under it
    const roomUnder = () => Math.floor(view - root!.getBoundingClientRect().bottom - 20);
    // a header or a stuck bar stays where it is however the page scrolls; and only as the field
    // is entered, not while it is worked in (a "-" closes the dropdown for a moment, the next
    // letter or a Backspace opens it again)
    if (opening && performance.now() - enteredAt < 500 && roomUnder() < DROP_MIN && !root.closest(".topnav, .bar.stuck")) {
      window.scrollBy({ top: DROP_MIN - roomUnder(), behavior: "instant" });
    }
    const below = roomUnder();
    // over the box: up to the header when it is in sight, and clear of the corner ribbon's band
    // on a wide window (its "Tags page" link is at the right end of the dropdown's top line)
    const box = root.getBoundingClientRect();
    const nav = document.querySelector(".topnav")?.getBoundingClientRect();
    const fromRight = window.innerWidth - box.right;
    const ceiling = Math.max(0, nav && nav.height > 0 ? nav.bottom : 0, window.innerWidth > 1000 ? 230 - fromRight : 0);
    const above = Math.floor(box.top - ceiling - 16);
    // (only once it gets really short: the page scrolled a little back does not flip it)
    const up = below < DROP_MIN * 0.66 && above > below;
    drop.toggleAttribute("data-up", up);
    drop.style.setProperty("--drop-room", `${Math.max(120, up ? above : below)}px`);
  };
  const refitDrop = () => fitDrop();

  onSettled(() => {
    window.addEventListener("scroll", refitDrop, { passive: true });
    window.addEventListener("resize", refitDrop);
    // the box moved to another page's header (App: oneSearch), which may not scroll at all
    const moved = () =>
      requestAnimationFrame(() => {
        refitDrop();
        // the focused piece of the box may have gone with the change (Clear with the query), and
        // not every browser says so with a focusout: the cloud stays only for focus still in it
        const at = document.activeElement;
        // (nor for a tag of it just pressed with the focus nowhere: the cloud is in use)
        if (within() && !holds(at) && !(!byKeys && holds(pressed ?? null)) && !at?.closest(".tag-menu")) setWithin(false);
      });
    window.addEventListener("hashchange", moved);
    return () => {
      window.removeEventListener("hashchange", moved);
      window.removeEventListener("scroll", refitDrop);
      window.removeEventListener("resize", refitDrop);
    };
  });

  onSettled(() => {
    const focusShortcut = (event: KeyboardEvent) => {
      const typing = event.target instanceof Element && event.target.closest("input, textarea, [contenteditable]");
      const slash = event.key === "/" && !typing;
      // by the key's place, so a Russian layout (л there) works too
      const commandK = event.code === "KeyK" && (MAC ? event.metaKey : event.ctrlKey);
      if (!slash && !commandK) return;
      event.preventDefault();
      input?.focus();
    };
    window.addEventListener("keydown", focusShortcut);
    // the search in use with the focus gone nowhere (a menu's press took it): Escape is the box's
    // all the same (a menu open takes it first)
    const escapeNowhere = (event: KeyboardEvent) => {
      const at = document.activeElement;
      if (event.key !== "Escape" || event.defaultPrevented || (at && at !== document.body)) return;
      if (!within() && !editing()) return;
      away = true;
      setWithin(false);
      if (editing()) stopEditing();
    };
    window.addEventListener("keydown", escapeNowhere);
    const press = (event: PointerEvent) => {
      // a press anywhere but on a suggestion or the menu it opened: what one was pressed for is
      // over (dragged off and let go, its menu left), so a change of the query after it is not its
      if (!(event.target as Element).closest?.(".suggestions li, .tag-menu")) fromList = undefined;
      dragFrom = currentQuery();
      pressedInBox = !!root?.contains(event.target as Node);
      const inMenu = !!(event.target as Element).closest?.(".tag-menu");
      if (!pressedInBox && !inMenu) away = true;
      // the cloud held open with the focus nowhere (a menu of it closed, a press in it): a press
      // anywhere but in it (or a menu) puts it away, as it would with the focus in it (Safari
      // focuses no chip it presses, to say so)
      if (within() && !inMenu && !holds(event.target as Element) && !root?.contains(document.activeElement)) setWithin(false);
      // a press in the cloud (or Clear), which keeps the focus where it is: from another piece of
      // the box (Clear, a tag Tabbed to), or from nowhere with the cloud held, it goes to the field,
      // as a press there with the focus in the field leaves it: the piece may go with the change
      const at = document.activeElement;
      const fromPiece = !!at && at !== input && !!root?.contains(at);
      const cloudOpen = !!root?.querySelector(".search-drop");
      if (event.button === 0 && cloudOpen && holds(event.target as Element) && (fromPiece || (within() && !root?.contains(at)))) input?.focus({ preventScroll: true });
      pressed = event.target instanceof Element ? event.target : undefined;
    };
    window.addEventListener("pointerdown", press, true);
    // Back or Forward is not the suggestion's doing either (and comes before the query it brings)
    // (popstate comes with the page's own changes of the address too, and with a link followed:
    // only an entry seen before, landed on again, is a step; route.ts marks each one it sees)
    const stepped = () => {
      if (!changingHere() && (history.state as { seen?: true } | null)?.seen) fromList = undefined;
    };
    window.addEventListener("popstate", stepped, true);
    // a focused element taken off the page blurs in the middle of an update: the note waits for its end
    const note = (on: boolean) => on !== within() && queueMicrotask(() => setWithin(on));
    // (the box moving to another page's header blurs and refocuses what had the focus: no change)
    const onFocusIn = (event: FocusEvent) => {
      if (moving) return;
      const to = event.target as Element;
      if (!root?.contains(to) && !to.closest?.(".tag-menu")) away = true;
      // into a menu: as it was (held only when opened from the cloud)
      if (to.closest?.(".tag-menu")) return;
      note(holds(to));
    };
    // (nor a press in a menu, which Safari answers with a focus gone nowhere: the field's blur saw to it)
    const onFocusOut = (event: FocusEvent) =>
      !moving && !event.relatedTarget && !(event.target as Element).closest?.(".tag-menu") && !(!byKeys && pressed?.closest(".tag-menu")) && note(false);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    // chips come and go, the zones take room, the window turns: the fades and arrows follow
    // a frame later: the arrows it shows change the row's size, which the observer would see in its own loop
    const resized = new ResizeObserver(() => requestAnimationFrame(markEdges));
    if (row) resized.observe(row);
    // let go off the box, a carried chip leaves the query; on a place, it goes there
    // the copy then lands on the chip the drop made, goes home when nothing changed, or fades when the chip left
    const stop = onDrop(
      (what, key, x) => {
        if (key === "outside") {
          if (!carried()) return;
          place(what, "remove");
          return () => "gone";
        }
        if (!key || !targets.has(key) || key === unarmed()) return;
        const before = currentQuery();
        // on the chips, it goes where the preview shows, read again where it was let go (a quick
        // drop can beat the frame that moves the preview)
        const { gap, join } = key === "field" ? aim(x, key) : {};
        place(what, join !== undefined ? { join } : gap !== undefined ? { before: gap } : targets.get(key)!);
        if (currentQuery() === before) return;
        // the query changed, so the caret effect runs once for it: that run leaves the row be
        landing = true;
        return () => landOn(what.kind === "tag" ? what.tag : what.raw);
      },
      (x, y) => !!carried() && outside(x, y),
      { snapshot, settled: () => route().q === currentQuery() },
    );
    return () => {
      window.removeEventListener("keydown", focusShortcut);
      window.removeEventListener("keydown", escapeNowhere);
      window.removeEventListener("pointerdown", press, true);
      window.removeEventListener("popstate", stepped, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      resized.disconnect();
      stop();
    };
  });

  /**
   * Over an end of the row, for a mouse: a page of chips that way. It shows on hover, and only
   * on a side with chips past it (styles.css); a finger swipes the row instead. Pressing it keeps
   * the focus where it was, and the click stays off the box, which would move the caret.
   */
  const RowArrow = (arrow: { way: -1 | 1 }) => (
    <button
      type="button"
      class={{ "row-arrow": true, left: arrow.way < 0, right: arrow.way > 0 }}
      tabindex="-1"
      aria-label={arrow.way < 0 ? t().scrollChips.left : t().scrollChips.right}
      title={arrow.way < 0 ? t().scrollChips.left : t().scrollChips.right}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.stopPropagation();
        page(arrow.way);
      }}
    >
      <Icon name="chevron" />
    </button>
  );

  const TermChip = (chip: { term: Term; clause: number; index: number }) => (
    <button
      // an "and" group is not carried as a whole: its tags are, one at a time
      {...(chip.term.all
        ? {}
        : draggable(() => ({ kind: "chip", clause: chip.clause, term: chip.index, raw: chip.term.raw, neg: chip.term.neg }), {
            touch: "hold",
            onHeld: (el, x, y) => chipMenu(undefined, chip.term.raw, el, x, y),
          }))}
      class={{ chip: true, neg: chip.term.neg, compound: !!chip.term.all, carried: isCarried(chip.clause, chip.index) }}
      data-ns={namespaceKey(chip.term.raw)}
      data-flip={flipKey(chip.term)}
      // let go on its own trace, a chip stays where it was
      data-drop={isCarried(chip.clause, chip.index) ? "stay" : undefined}
      // an "and" group has no menu of its own (its text is no tag): its parts have theirs, and Tab
      // goes to them instead of to the group
      tabindex={chip.term.all ? -1 : undefined}
      onClick={(event) => !chip.term.all && chipMenu(event, chip.term.raw)}
      onContextMenu={(event) => (chip.term.all ? event.preventDefault() : openTagMenu(event, chip.term.raw))}
    >
      {/* an AND inside an OR: its parts in brackets, each its own chip to drag out */}
      <Show when={chip.term.all} fallback={<TagLabel tag={chip.term.raw} />}>
        {(all) => (
          <span class="and-group">
            <span class="bracket">(</span>
            <For each={all()}>
              {(part, k) => (
                <>
                  <Show when={k() > 0}>
                    <span class="chip-op">{t().and}</span>
                  </Show>
                  <PartChip part={part} clause={chip.clause} term={chip.index} index={k()} />
                </>
              )}
            </For>
            <span class="bracket">)</span>
          </span>
        )}
      </Show>
    </button>
  );


  const PartChip = (chip: { part: Term; clause: number; term: number; index: number }) => {
    const drag = draggable(() => ({ kind: "chip", clause: chip.clause, term: chip.term, part: chip.index, raw: chip.part.raw, neg: chip.part.neg }), {
      touch: "hold",
      onHeld: (el, x, y) => chipMenu(undefined, chip.part.raw, el, x, y),
    });
    return (
      <span
        draggable={drag.draggable}
        onDragStart={drag.onDragStart}
        // the part, not the whole group around it
        onPointerDown={(event) => {
          event.stopPropagation();
          drag.onPointerDown(event);
        }}
        onClick={(event) => {
          event.stopPropagation();
          chipMenu(event, chip.part.raw);
        }}
        onContextMenu={(event) => {
          event.stopPropagation();
          openTagMenu(event, chip.part.raw);
        }}
        // reached with Tab like any chip, Enter or Space opens its menu
        tabindex="0"
        role="button"
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          if (PHONE.matches && !editing()) {
            input?.focus();
            return;
          }
          const el = event.currentTarget as HTMLElement;
          const box = el.getBoundingClientRect();
          openAt(el, chip.part.raw, box.left, box.bottom, true);
        }}
        class={{ part: true, neg: chip.part.neg, carried: isCarriedPart(chip.clause, chip.term, chip.index) }}
        data-ns={namespaceKey(chip.part.raw)}
        data-flip={flipKey(chip.part)}
        data-drop={isCarriedPart(chip.clause, chip.term, chip.index) ? "stay" : undefined}
      >
        <TagLabel tag={chip.part.raw} />
      </span>
    );
  };

  /**
   * One suggestion. A tag is picked up and held as on the page: dragged onto a zone or among the
   * chips, or let go in place for its menu; the text option is only picked. One the search has
   * already is framed as that tag is on the page.
   */
  const Suggestion = (row: { tag: string; count: number; index: number }) => {
    const drag =
      row.count >= 0
        ? draggable(() => ({ kind: "tag", tag: row.tag }), { touch: "hold", onHeld: (el, x, y) => openAt(el, row.tag, x, y), copy: ".suggest-tag" })
        : undefined;
    return (
      <li
        role="option"
        id={`search-option-${row.index}`}
        aria-selected={row.index === active() ? "true" : "false"}
        class={{ active: row.index === active(), used: uses(route().q, row.tag), excluded: excludesTag(route().q, row.tag) }}
        data-ns={namespaceKey(row.tag)}
        onPointerDown={(event) => {
          fromList = row.tag;
          drag?.onPointerDown(event);
        }}
        onContextMenu={(event) => row.count >= 0 && openTagMenu(event, row.tag)}
        // the field keeps the focus; the pick is the click, so a press can become a drag
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          pick(row.tag, true);
          input?.focus();
        }}
      >
        {/* the text option reads as an action, not as one more tag */}
        <Show
          when={/^-?text:/.test(row.tag)}
          fallback={
            <span class="suggest-tag" data-ns={namespaceKey(row.tag)}>
              {row.tag}
            </span>
          }
        >
          <span class="suggest-text">{t().searchFor(row.tag.replace(/^-?text:"|"$/g, ""))}</span>
          <kbd class="search-kbd">Enter</kbd>
        </Show>
        <Show when={row.count >= 0}>
          <span class="tag-count">{row.count}</span>
        </Show>
      </li>
    );
  };

  return (
    <div
      class={{ search: true, focused: focused(), editing: editing(), dragging: !!dragged(), outside: over() === "outside" }}
      ref={(el) => (root = el)}
      // Escape on Clear or in the cloud closes it too, as it does in the field
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.target === input || event.defaultPrevented) return;
        away = true;
        setWithin(false);
        if (editing()) stopEditing();
        else (event.target as HTMLElement).blur();
      }}
    >
      <div
        class={{ "search-field": true, over: over() === "field" }}
        onPointerDown={() => {
          if (!editing()) pressedAt = window.scrollY;
        }}
        onClick={(event) => {
          // a click on the empty part of the box puts the caret after the last chip
          if ((event.target as HTMLElement).matches(".search-field, .chips")) setCaret(undefined);
          input?.focus();
        }}
        {...target("field", { before: clauses().length })}
      >
        {/* flex order keeps the one text field where the caret is, between chips, without remounting it */}
        <Icon name="search" class="search-icon" />
        <RowArrow way={-1} />
        {/* chips and the text field in one row of their own that scrolls sideways, so the box
            stays one line and the drop zones keep the right side */}
        <span
          class="chips"
          ref={(el) => (row = el)}
          onScroll={markEdges}
          // a chip reached with Tab stands clear of the end (a focus scroll leaves it at the edge)
          onFocusIn={(event) => (event.target as HTMLElement).matches(".chip:focus-visible, .part:focus-visible") && reveal(event.target as HTMLElement)}
        >
          <For each={clauses()}>
            {(clause: Clause, index) => (
              <>
                <Show
                  when={!("raw" in clause) && clause}
                  fallback={
                    <button
                      {...draggable(() => ({ kind: "chip", clause: index(), term: -1, raw: (clause as { raw: string }).raw, neg: false }), { touch: "hold" })}
                      class={{ chip: true, raw: true, carried: isCarried(index(), -1) }}
                      style={{ order: 2 * index() + 2 }}
                      data-flip={`raw:${(clause as { raw: string }).raw.toLowerCase()}`}
                      data-drop={isCarried(index(), -1) ? "stay" : undefined}
                      // a query too nested for chips has no menu: a click takes it back into the field to edit
                      onClick={() => {
                        const raw = (clause as { raw: string }).raw;
                        // the text still in the field goes in first, which can move the chip
                        commit(draft());
                        const at = toClauses(currentQuery()).findIndex((each) => "raw" in each && each.raw === raw);
                        if (at < 0) return;
                        removeAt(at);
                        setCaret(at >= toClauses(currentQuery()).length ? undefined : at);
                        setDraft(raw);
                        input?.focus();
                      }}
                    >
                      {(clause as { raw: string }).raw}
                    </button>
                  }
                >
                  {(group) => (
                    <span
                      class={{ clause: true, "chip-group": group().terms.length > 1 || joinAt() === index(), over: joinAt() === index() }}
                      style={{ order: 2 * index() + 2 }}
                      data-flip={clauseKey(group().terms)}
                    >
                      <For each={group().terms}>
                        {(term, termIndex) => (
                          <>
                            <Show when={termIndex() > 0}>
                              <span class="chip-op">{t().or}</span>
                            </Show>
                            <span class="term">
                              {/* only inside an "or" group, a tab over each alternative: dropped there,
                                  it becomes (this and the tag); a lone chip has "Add (and)" for that */}
                              <Show when={staysOr(index()) && !(carried()?.clause === index() && carried()?.term === termIndex())}>
                                <span
                                  class={{ "and-tab": true, over: over() === `and-${index()}-${termIndex()}` }}
                                  {...target(`and-${index()}-${termIndex()}`, { andWith: { clause: index(), term: termIndex() } })}
                                >
                                  {t().and}
                                </span>
                              </Show>
                              <TermChip term={term} clause={index()} index={termIndex()} />
                            </span>
                          </>
                        )}
                      </For>
                      {/* over the middle of a chip, the group it would make: "or" and the tag, in its frame */}
                      <Show when={joinAt() === index() && preview()}>
                        {(chip) => (
                          <span class={{ "join-preview": true, idle: over() !== "field" }} aria-hidden="true">
                            <span class="chip-op">{t().or}</span>
                            <span class={{ chip: true, slot: true, neg: chip().neg }} data-ns={namespaceKey(chip().raw)}>
                              <TagLabel tag={chip().raw} />
                            </span>
                          </span>
                        )}
                      </Show>
                    </span>
                  )}
                </Show>
              </>
            )}
          </For>
          <Show when={insertAt() !== undefined && preview()}>
            {(chip) => (
              <span
                class={{ chip: true, slot: true, neg: chip().neg, idle: over() !== "field" && over() !== "add" && over() !== "negate" }}
                style={{ order: 2 * insertAt()! + 1 }}
                data-ns={namespaceKey(chip().raw)}
                aria-hidden="true"
              >
                <TagLabel tag={chip().raw} />
              </span>
            )}
          </Show>
          <input
            style={{ order: 2 * caretAt() + 1, width: caretAt() < clauses().length ? `max(2px, ${draft().length + 0.3}ch)` : undefined }}
            class={{ inside: caretAt() < clauses().length }}
            ref={(el) => (input = el)}
            type="text"
            placeholder={clauses().length ? "" : t().searchPlaceholder}
            value={draft()}
            autocomplete="off"
            autocapitalize="none"
            autocorrect="off"
            enterkeyhint="search"
            spellcheck={false}
            aria-label={t().searchPlaceholder}
            // a combobox to a screen reader: the suggestions are its list, the arrows move in it
            role="combobox"
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={options().length > 0 ? "true" : "false"}
            aria-activedescendant={options().length > 0 ? `search-option-${Math.min(active(), options().length - 1)}` : undefined}
            onInput={onInput}
            onFocus={() => {
              if (moving) return;
              if (away) enteredAt = performance.now();
              away = false;
              rewind = false;
              setFocused(true);
              startEditing();
            }}
            onBlur={(event) => {
              if (moving) return;
              // editing on a phone, a tag or chip pressed on the screen takes the focus (a long
              // press focuses a link), and so does a button of a chip's menu: the field takes it
              // back, keeping the keyboard and the text
              // (Safari gives no relatedTarget for a pressed button: the press tells it then)
              // (the press can be on an icon in a button: an svg, not an HTMLElement)
              const to = ((event.relatedTarget as Element | null) ?? (!byKeys && pressed && (pressedInBox || pressed.closest(".tag-menu")) ? pressed : null)) as HTMLElement | null;
              // to a chip, Clear or a chip's menu: still at work in the search; anything else is away
              away = !to || !(root?.contains(to) || to.closest(".tag-menu"));
              // (not a Tab or a menu's arrows: the keys go where they lead)
              if (editing() && !leaving && !byKeys && to && ((root?.contains(to) && grabs(to)) || to.closest(".tag-menu"))) {
                input?.focus({ preventScroll: true });
                return;
              }
              // Tab into the cloud: it stays for the focus to land in (the note on focusin comes late)
              // (and so does the arrow into the menu of a tag of the cloud, opened with a press)
              if ((holds(to) || (to?.closest(".tag-menu") && holds(menuTrigger()))) && !leaving) setWithin(true);
              const inBox = to ? !!root?.contains(to) : pressedInBox;
              if (!editing() && !inBox) rewind = true;
              setCaret(undefined);
              setFocused(false);
              // a chip pressed for its menu, or Clear: the text waits in the field, so the menu
              // is not closed by a new query, and Clear is one step back, not two
              const on = to ?? (pressedInBox ? pressed : undefined);
              if (!on?.closest(".chip, .part, .search-clear, .tag-menu")) commit(draft());
            }}
            onKeyDown={onKeyDown}
          />
        </span>
        <RowArrow way={1} />
        {/* while something is dragged, the whole box adds it (after the chips, a hint says so); two
            zones of their own, always the same size in the same place, negate it or keep only it */}
        {/* on a phone's editing screen they stay docked over the keyboard, faded until a drag, so
            the tags never lie under them */}
        <Show when={dragged() || editing()}>
          <Show when={dragged()}>
            {/* where adding would change nothing (a lone chip carried), it is only the box, unlabelled */}
            <span class={{ "drop-add": true, over: showAdd() && over() === "add" }} {...(showAdd() ? target("add", { before: clauses().length }) : {})}>
              <Show when={showAdd()}>
                <b>+</b> {t().drop.add}
              </Show>
            </span>
          </Show>
          <span class="drop-board">
            <span class={{ "drop-zone": true, negate: true, over: lit("negate") }} {...target("negate", "negate")}>
              {/* a negated chip loses its minus there */}
              <Show when={carriedNeg()} fallback={<><b>−</b> {t().drop.negate}</>}>
                <b>+</b> {t().drop.include}
              </Show>
            </span>
            {/* there even when it would change nothing, so the zones do not move */}
            <span class={{ "drop-zone": true, off: !showOnly(), over: showOnly() && lit("only") }} {...(showOnly() ? target("only", "only") : {})}>
              <b>=</b> {t().drop.only}
            </span>
          </span>
        </Show>
        {/* on a phone's editing screen it stays put while dragging, so the bar does not move */}
        <Show when={(route().q || draft()) && (!dragged() || editing())}>
          <button
            class="search-clear"
            aria-label={t().clear}
            title={t().clear}
            // the field keeps the focus through the press (it gets it after anyway): nothing it
            // shows closes and opens again on the way
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              setDraft("");
              if (currentQuery()) setQuery("");
              // the button goes with the query: the field takes the focus, ready for a new one
              input?.focus();
            }}
          >
            <Icon name="close" />
          </button>
        </Show>
        <Show when={!route().q && !draft() && !dragged()}>
          <kbd class="search-kbd">{MAC ? "⌘K" : "Ctrl K"}</kbd>
        </Show>
      </div>

      <Show when={editing()}>
        {/* back to the page, as a phone's search screens have it */}
        <button class="search-done" aria-label={t().done} title={t().done} onClick={stopEditing}>
          <Icon name="back" />
        </button>
      </Show>

      <Show when={options().length > 0 || showCloud()}>
        {/* mousedown keeps focus in the input, so its blur doesn't close the dropdown first */}
        <div
          class="search-drop"
          ref={() => requestAnimationFrame(() => fitDrop(true))}
          onMouseDown={(event) => event.preventDefault()}
          // "Tags page" leaves the search: the page it opens is to read, not under the dropdown
          onClick={(event) => {
            if (!(event.target as Element).closest(".cloud-more")) return;
            if (editing()) stopEditing();
            else input?.blur();
            // after the blur, which took the press on the link for one inside the box (and kept
            // the cloud for it: on the Tags page itself no page change closes it after)
            setWithin(false);
            away = true;
          }}
        >
          {/* the query read out, quietly, where it is being worked on: only when the chips
              alone take some reading (groups, a minus, more than one); not on a phone's
              editing screen, where the room is for the tags */}
          <Show when={!editing() && inWords(clauses(), t().says)}>
            {(words) => (
              <div class="query-says">
                <span>{words()}</span>
              </div>
            )}
          </Show>
          <Show when={options().length > 0} fallback={<TagCloud />}>
            <ul class="suggestions" role="listbox" id="search-suggestions">
              <For each={options()}>{([tag, count], index) => <Suggestion tag={tag} count={count} index={index()} />}</For>
            </ul>
          </Show>
        </div>
      </Show>
    </div>
  );
}
