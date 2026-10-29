import { createMemo, createSignal, For, onSettled, Show } from "solid-js";
import { andWith, applyTag, dropTag, editTerm, moveTerm, toClauses, toQuery, type Clause, type Drop, type Term } from "./clauses";
import { draggable, dragged, onDrop, over, type Dragged } from "./drag";
import { t } from "./i18n";
import { Icon } from "./icons";
import { currentQuery, route, setQuery } from "./route";
import { knowsTerm, suggest, textTerm } from "./search";
import { namespaceKey, TagLabel } from "./Tag";
import TagCloud from "./TagCloud";
import { openTagMenu } from "./TagMenu";

/** Where a dragged tag or chip can land: a place among the chips, or one of the big zones. */
type Target = Drop | "negate" | "remove" | "only" | { andWith: { clause: number; term: number } };

/** A space ends a term unless it sits inside an open quote. */
const openQuote = (text: string) => (text.match(/"/g)?.length ?? 0) % 2 === 1;

/**
 * The search box: the query as chips (AND between chips, OR inside a group), then a text
 * field with tag autocomplete. A space or Enter turns the text into a chip, Backspace on an
 * empty field takes the chip before the caret back, a chip click opens the tag menu. Chips
 * and tags from the page can be dragged in (drag.ts): onto the zones of the box, the "or"
 * tab under a chip, the "and" tab over an alternative in an "or" group; a chip let go off the box
 * leaves the query.
 * `/` and ⌘K focus it from anywhere. Once it sticks to the top, focusing it shows the
 * tag cloud in a dropdown.
 */
export default function SearchBox(props: { stuck: boolean }) {
  let input: HTMLInputElement | undefined;
  let root: HTMLDivElement | undefined;
  const outside = (x: number, y: number) => {
    const box = root?.getBoundingClientRect();
    return !box || x < box.left || x > box.right || y < box.top || y > box.bottom;
  };
  const [draft, setDraft] = createSignal("");
  const [focused, setFocused] = createSignal(false);
  const [active, setActive] = createSignal(0);

  const clauses = createMemo(() => toClauses(route().q));
  // tags for one word; the words themselves as a text search, last, for anything that is not all tags
  const options = createMemo((): [string, number][] => {
    const value = draft().trim();
    if (!focused() || !value) return [];
    const words = value.split(/\s+/);
    if (words.length > 1) return words.every(knowsTerm) ? [] : [[textTerm(value), -1]];
    const tags = suggest(value.replace(/^[-!]/, ""));
    return knowsTerm(value) && tags.length > 0 ? tags : [...tags, [textTerm(value), -1]];
  });
  const showCloud = () => focused() && props.stuck && !draft().trim();

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
    const words = value.split(/\s+/);
    if (!words.every(knowsTerm)) {
      pick(textTerm(value));
      return;
    }
    // a negated word goes through the menu logic (no duplicates); other words join as their own clauses
    insert(/^[-!]\S+$/.test(value) ? applyTag(q, value.slice(1), "exclude") : toQuery([...toClauses(q), ...toClauses(value)]));
    setDraft("");
    setActive(0);
  };

  const pick = (term: string) => {
    const negate = /^[-!]/.test(term) || /^[-!]/.test(draft());
    insert(applyTag(currentQuery(), term.replace(/^[-!]/, ""), negate ? "exclude" : "and"));
    setDraft("");
    setActive(0);
    input?.focus();
  };

  /** Takes a chip next to the caret back out of the query. */
  const removeAt = (index: number) => setQuery(toQuery(clauses().filter((_, i) => i !== index)));

  const onKeyDown = (event: KeyboardEvent) => {
    const list = options();
    if (event.key === "Escape") {
      input?.blur();
    } else if (event.key === "Backspace" && !draft() && caretAt() > 0) {
      // the chip before the caret comes back as text
      event.preventDefault();
      const index = caretAt() - 1;
      const chip = clauses()[index];
      removeAt(index);
      setCaret(caret() === undefined ? undefined : index);
      setDraft("raw" in chip ? chip.raw : toQuery([chip]));
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
    } else if (list.length > 0 && (event.key === "Enter" || event.key === "Tab")) {
      event.preventDefault();
      pick(list[Math.min(active(), list.length - 1)][0]);
    } else if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft());
    } else if (event.key === " " && isOneKnownWord(draft())) {
      // a tag ends at a space; other words keep going, they are a phrase to search for
      event.preventDefault();
      commit(draft());
    }
  };

  const isOneKnownWord = (text: string) => /^\S+$/.test(text.trim()) && !openQuote(text) && knowsTerm(text);

  const onInput = (value: string) => {
    setDraft(value);
    setActive(0);
  };

  const place = (what: Dragged, to: Target) => {
    const at = carried();
    const q = currentQuery();
    if (typeof to === "object" && "andWith" in to) {
      if (what.kind === "tag" && !at) setQuery(andWith(q, to.andWith, { raw: what.tag, neg: false }));
      else if (at) setQuery(andWith(q, to.andWith, (clauses()[at.clause] as { terms: Term[] }).terms[at.term], at));
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
    const term = (clauses()[at.clause] as { terms: Term[] }).terms[at.term];
    if (to === "only") setQuery(`${term.neg ? "-" : ""}${term.raw}`);
    else setQuery(to === "negate" || to === "remove" ? editTerm(q, at, to) : moveTerm(q, at, to));
  };

  /**
   * The chip in the search that is being carried: a chip dragged out of it, or a tag from
   * the page that the search already has. It leaves the box while it is carried.
   */
  const carried = createMemo(() => {
    const what = dragged();
    if (!what) return undefined;
    if (what.kind === "chip") return { clause: what.clause, term: what.term };
    for (const [index, clause] of clauses().entries()) {
      if ("raw" in clause) continue;
      const term = clause.terms.findIndex((each) => each.raw.toLowerCase() === what.tag.toLowerCase());
      if (term >= 0) return { clause: index, term };
    }
    return undefined;
  });
  const isCarried = (clause: number, term: number) => carried()?.clause === clause && carried()?.term === term;
  /** Joining a chip with "or" means something only for chips other than the carried one's own group. */
  const canJoin = (index: number) => !!dragged() && carried()?.clause !== index;

  /** A group that is still an "or" with the carried chip gone from it: its alternatives get "and" tabs. */
  const staysOr = (index: number) => {
    const clause = clauses()[index];
    if (!dragged() || !clause || "raw" in clause) return false;
    return clause.terms.length - (carried()?.clause === index ? 1 : 0) > 1;
  };

  const carriedGroupSize = () => {
    const at = carried();
    const clause = at && clauses()[at.clause];
    return clause && !("raw" in clause) ? clause.terms.length : 0;
  };
  // only the zones that would change something
  const showAdd = () => !carried() || (carried()!.term >= 0 && carriedGroupSize() > 1);
  const showOnly = () => clauses().length > (carried() && carriedGroupSize() === 1 ? 1 : 0);

  // every drop place by its key (data-drop), so the drag can tell what it was let go on
  const targets = new Map<string, Target>();
  const target = (key: string, to: Target) => (targets.set(key, to), { "data-drop": key });

  onSettled(() => {
    const focusShortcut = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement).closest("input, textarea");
      const slash = event.key === "/" && !typing;
      const commandK = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      if (!slash && !commandK) return;
      event.preventDefault();
      input?.focus();
    };
    window.addEventListener("keydown", focusShortcut);
    // let go off the box, a carried chip leaves the query; on a place, it goes there
    const stop = onDrop(
      (what, key) => {
        if (key === "outside") {
          if (carried()) place(what, "remove");
        } else if (key && targets.has(key)) {
          place(what, targets.get(key)!);
        }
      },
      (x, y) => !!carried() && outside(x, y),
    );
    return () => {
      window.removeEventListener("keydown", focusShortcut);
      stop();
    };
  });

  const TermChip = (chip: { term: Term; clause: number; index: number }) => (
    <button
      {...draggable(() => ({ kind: "chip", clause: chip.clause, term: chip.index, raw: chip.term.raw, neg: chip.term.neg }))}
      class={{ chip: true, neg: chip.term.neg, compound: !!chip.term.all, carried: isCarried(chip.clause, chip.index) }}
      data-ns={namespaceKey(chip.term.raw)}
      onClick={(event) => openTagMenu(event, chip.term.raw)}
      onContextMenu={(event) => openTagMenu(event, chip.term.raw)}
    >
      {/* an AND inside an OR: its parts in brackets, carried as one */}
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
                  <span class={{ part: true, neg: part.neg }} data-ns={namespaceKey(part.raw)}>
                    <TagLabel tag={part.raw} />
                  </span>
                </>
              )}
            </For>
            <span class="bracket">)</span>
          </span>
        )}
      </Show>
    </button>
  );


  return (
    <div class={{ search: true, focused: focused(), dragging: !!dragged(), outside: over() === "outside" }} ref={(el) => (root = el)}>
      <div
        class={{ "search-field": true, over: over() === "field" }}
        onClick={(event) => {
          // a click on the empty part of the box puts the caret after the last chip
          if ((event.target as HTMLElement).matches(".search-field, .chips")) setCaret(undefined);
          input?.focus();
        }}
        {...target("field", { before: clauses().length })}
      >
        {/* flex order keeps the one text field where the caret is, between chips, without remounting it */}
        <Icon name="search" class="search-icon" />
        {/* chips and the text field wrap in their own box, so the drop zones keep the right side */}
        <span class="chips">
          <For each={clauses()}>
            {(clause: Clause, index) => (
              <>
                <Show
                  when={!("raw" in clause) && clause}
                  fallback={
                    <button
                      {...draggable(() => ({ kind: "chip", clause: index(), term: -1, raw: (clause as { raw: string }).raw, neg: false }))}
                      class={{ chip: true, raw: true, carried: isCarried(index(), -1) }}
                      style={{ order: 2 * index() + 2 }}
                    >
                      {(clause as { raw: string }).raw}
                    </button>
                  }
                >
                  {(group) => (
                    <span
                      class={{ clause: true, "chip-group": group().terms.length > 1, over: over() === `join-${index()}` }}
                      style={{ order: 2 * index() + 2 }}
                    >
                      <For each={group().terms}>
                        {(term, termIndex) => (
                          <>
                            <Show when={termIndex() > 0 && !isCarried(index(), termIndex())}>
                              <span class="chip-op">{t().or}</span>
                            </Show>
                            <span class="term">
                              {/* only inside an "or" group, a tab over each alternative: dropped there,
                                  it becomes (this and the tag); a lone chip has "Add (and)" for that */}
                              <Show when={staysOr(index()) && !isCarried(index(), termIndex())}>
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
                      {/* a tab hanging under the chip: dropped there, the tag joins it with "or" */}
                      <Show when={canJoin(index())}>
                        <span class={{ "or-tab": true, over: over() === `join-${index()}` }} {...target(`join-${index()}`, { join: index() })}>
                          {t().drop.or}
                        </span>
                      </Show>
                    </span>
                  )}
                </Show>
              </>
            )}
          </For>
          <input
            style={{ order: 2 * caretAt() + 1, width: caretAt() < clauses().length ? `max(2px, ${draft().length + 0.3}ch)` : undefined }}
            class={{ inside: caretAt() < clauses().length }}
            ref={(el) => (input = el)}
            type="text"
            placeholder={clauses().length ? "" : t().searchPlaceholder}
            value={draft()}
            autocomplete="off"
            spellcheck={false}
            aria-label={t().searchPlaceholder}
            onInput={(event) => onInput(event.currentTarget.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setCaret(undefined);
              setFocused(false);
              commit(draft());
            }}
            onKeyDown={onKeyDown}
          />
        </span>
        {/* while something is dragged, the free part of the box becomes big zones, one per action */}
        <Show when={dragged()}>
          <span class="drop-board">
            <Show when={showAdd()}>
              <span class={{ "drop-zone": true, add: true, over: over() === "add" }} {...target("add", { before: clauses().length })}>
                <b>+</b> {t().drop.add}
              </span>
            </Show>
            <span class={{ "drop-zone": true, negate: true, over: over() === "negate" }} {...target("negate", "negate")}>
              <b>−</b> {t().drop.negate}
            </span>
            <Show when={showOnly()}>
              <span class={{ "drop-zone": true, over: over() === "only" }} {...target("only", "only")}>
                <b>=</b> {t().drop.only}
              </span>
            </Show>
          </span>
        </Show>
        <Show when={route().q && !dragged()}>
          <button
            class="search-clear"
            aria-label={t().clear}
            title={t().clear}
            onClick={(event) => {
              event.stopPropagation();
              setQuery("");
            }}
          >
            <Icon name="close" />
          </button>
        </Show>
        <Show when={!route().q && !dragged()}>
          <kbd class="search-kbd">⌘K</kbd>
        </Show>
      </div>

      <Show when={options().length > 0 || showCloud()}>
        {/* mousedown keeps focus in the input, so its blur doesn't close the dropdown first */}
        <div class="search-drop" onMouseDown={(event) => event.preventDefault()}>
          <Show when={options().length > 0} fallback={<TagCloud />}>
            <ul class="suggestions" role="listbox">
              <For each={options()}>
                {([tag, count], index) => (
                  <li
                    role="option"
                    aria-selected={index() === active() ? "true" : "false"}
                    class={{ active: index() === active() }}
                    data-ns={namespaceKey(tag)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      pick(tag);
                    }}
                  >
                    {/* the text option reads as an action, not as one more tag */}
                    <Show when={/^-?text:/.test(tag)} fallback={<span>{tag}</span>}>
                      <span class="suggest-text">{t().searchFor(tag.replace(/^-?text:"|"$/g, ""))}</span>
                      <kbd class="search-kbd">Enter</kbd>
                    </Show>
                    <Show when={count >= 0}>
                      <span class="tag-count">{count}</span>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>
      </Show>
    </div>
  );
}
