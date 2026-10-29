import { createMemo, createSignal, For, onSettled, Show } from "solid-js";
import { applyTag, dropTag, editTerm, moveTerm, toClauses, toQuery, type Clause, type Drop, type Term } from "./clauses";
import { allowDrop, beginDrag, dragged, endDrag, startDrag } from "./drag";
import { t } from "./i18n";
import { Icon } from "./icons";
import { currentQuery, route, setQuery } from "./route";
import { knowsTerm, suggest, textTerm } from "./search";
import { namespaceKey, TagLabel } from "./Tag";
import TagCloud from "./TagCloud";
import { openTagMenu } from "./TagMenu";

/** Where a dragged tag or chip can land: a place among the chips, or one of the big zones. */
type Target = Drop | "negate" | "remove" | "only";

/** A space ends a term unless it sits inside an open quote. */
const openQuote = (text: string) => (text.match(/"/g)?.length ?? 0) % 2 === 1;

/**
 * The search box: the query as chips (AND between chips, OR inside a group), then a text
 * field with tag autocomplete. A space or Enter turns the text into a chip, Backspace on an
 * empty field takes the last chip back, a chip click opens the tag menu. Chips can be
 * dragged: onto another chip to join it with OR, between chips to stand alone, onto
 * "without" or "remove". Tags from the page can be dragged in as well.
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
  const [over, setOver] = createSignal<string | undefined>();

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

  const drop = (event: DragEvent, to: Target) => {
    event.preventDefault();
    event.stopPropagation();
    place(to);
  };

  const place = (to: Target) => {
    const what = dragged();
    const at = carried();
    setOver(undefined);
    endDrag();
    if (!what) return;
    const q = currentQuery();
    // a tag from the page that is already in the search moves that chip, like a chip would
    if (what.kind === "tag" && !at) {
      if (to === "remove") return;
      if (to === "only") setQuery(what.tag);
      else setQuery(to === "negate" ? applyTag(q, what.tag, "exclude") : dropTag(q, what.tag, to));
      return;
    }
    if (!at) return;
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
  const isCarried = (clause: number, term: number) => lifted() && carried()?.clause === clause && carried()?.term === term;
  /** Joining a chip with "or" means something only for chips other than the carried one's own group. */
  const canJoin = (index: number) => !!dragged() && carried()?.clause !== index;

  const carriedGroupSize = () => {
    const at = carried();
    const clause = at && clauses()[at.clause];
    return clause && !("raw" in clause) ? clause.terms.length : 0;
  };
  // only the zones that would change something
  const showAdd = () => !carried() || carriedGroupSize() > 1;
  const showOnly = () => clauses().length > (carried() && carriedGroupSize() === 1 ? 1 : 0);

  // the carried chip disappears from the box just after the drag starts (hiding it at once would cancel the drag)
  const [lifted, setLifted] = createSignal(false);

  // every drop place by its key, so a finger drag can find what is under it (data-drop)
  const targets = new Map<string, Target>();
  const target = (key: string, to: Target) => (targets.set(key, to), {
    "data-drop": key,
    onDragOver: (event: DragEvent) => {
      allowDrop(event);
      event.stopPropagation();
      setOver(key);
    },
    onDragLeave: () => over() === key && setOver(undefined),
    onDrop: (event: DragEvent) => drop(event, to),
  });

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

    // a chip carried out of the search box and let go there is taken out of the query
    const overPage = (event: DragEvent) => {
      if (!carried() || !outside(event.clientX, event.clientY)) return;
      event.preventDefault();
      setOver("outside");
    };
    const dropOnPage = (event: DragEvent) => {
      if (!carried() || !outside(event.clientX, event.clientY)) return;
      event.preventDefault();
      place("remove");
    };
    const lift = () => setTimeout(() => setLifted(true), 0);
    const settle = () => setLifted(false);
    window.addEventListener("dragover", overPage);
    window.addEventListener("drop", dropOnPage);
    window.addEventListener("dragstart", lift, true);
    window.addEventListener("dragend", settle, true);
    return () => {
      window.removeEventListener("keydown", focusShortcut);
      window.removeEventListener("dragover", overPage);
      window.removeEventListener("drop", dropOnPage);
      window.removeEventListener("dragstart", lift, true);
      window.removeEventListener("dragend", settle, true);
    };
  });

  /**
   * Phones have no drag and drop for elements, so a finger drags a chip by hand: past 8px
   * of movement the chip follows the finger, the place under it lights up, and letting go
   * drops it there. A touch that does not move stays a tap and opens the tag menu.
   */
  let moved = false;
  const fingerDrag = (chip: { term: Term; clause: number; index: number }) => {
    let start = { x: 0, y: 0 };
    let el: HTMLElement | undefined;
    const keyAt = (x: number, y: number) =>
      (document.elementFromPoint(x, y)?.closest("[data-drop]") as HTMLElement | null)?.dataset.drop;
    return {
      onPointerDown: (event: PointerEvent) => {
        if (event.pointerType === "mouse") return;
        el = event.currentTarget as HTMLElement;
        start = { x: event.clientX, y: event.clientY };
        moved = false;
        try {
          el.setPointerCapture(event.pointerId);
        } catch {
          // a pointer the browser no longer tracks; the drag then follows events as they come
        }
      },
      onPointerMove: (event: PointerEvent) => {
        if (!el || event.pointerType === "mouse") return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (!moved && Math.hypot(dx, dy) < 8) return;
        if (!moved) {
          moved = true;
          beginDrag({ kind: "chip", clause: chip.clause, term: chip.index, raw: chip.term.raw, neg: chip.term.neg });
          el.classList.add("lifted");
        }
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        setOver(outside(event.clientX, event.clientY) ? "outside" : keyAt(event.clientX, event.clientY));
      },
      onPointerUp: (event: PointerEvent) => {
        if (!el || event.pointerType === "mouse") return;
        const key = moved ? keyAt(event.clientX, event.clientY) : undefined;
        const thrownOut = moved && outside(event.clientX, event.clientY);
        el.style.transform = "";
        el.classList.remove("lifted");
        el = undefined;
        setOver(undefined);
        if (thrownOut) place("remove");
        else if (key && targets.has(key)) place(targets.get(key)!);
        else endDrag();
      },
      onPointerCancel: () => {
        if (!el) return;
        el.style.transform = "";
        el.classList.remove("lifted");
        el = undefined;
        moved = false;
        setOver(undefined);
        endDrag();
      },
    };
  };

  const TermChip = (chip: { term: Term; clause: number; index: number }) => (
    <button
      {...fingerDrag(chip)}
      class={{ chip: true, neg: chip.term.neg, carried: isCarried(chip.clause, chip.index) }}
      data-ns={namespaceKey(chip.term.raw)}
      draggable="true"
      onDragStart={(event) => startDrag(event, { kind: "chip", clause: chip.clause, term: chip.index, raw: chip.term.raw, neg: chip.term.neg })}
      onDragEnd={() => {
        setOver(undefined);
        endDrag();
      }}
      onClick={(event) => {
        // the click that ends a finger drag is not a tap
        if (moved) {
          moved = false;
          return;
        }
        openTagMenu(event, chip.term.raw);
      }}
      onContextMenu={(event) => openTagMenu(event, chip.term.raw)}
    >
      <TagLabel tag={chip.term.raw} />
    </button>
  );


  return (
    <div class={{ search: true, focused: focused(), dragging: !!dragged() }} ref={(el) => (root = el)}>
      <div
        class={{ "search-field": true, over: over() === "field" }}
        onClick={(event) => {
          // a click on the empty part of the box puts the caret after the last chip
          if (event.target === event.currentTarget) setCaret(undefined);
          input?.focus();
        }}
        {...target("field", { before: clauses().length })}
      >
        {/* flex order keeps the one text field where the caret is, between chips, without remounting it */}
        <Icon name="search" class="search-icon" />
        <For each={clauses()}>
          {(clause: Clause, index) => (
            <>
              <Show
                when={!("raw" in clause) && clause}
                fallback={
                  <span class="chip raw" style={{ order: 2 * index() + 2 }}>
                    {(clause as { raw: string }).raw}
                  </span>
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
                          <TermChip term={term} clause={index()} index={termIndex()} />
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
          style={{ order: 2 * caretAt() + 1, width: caretAt() < clauses().length ? `${Math.max(2, draft().length + 1)}ch` : undefined }}
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
            <Show when={carried()}>
              <span class={{ "drop-hint": true, out: over() === "outside" }}>{over() === "outside" ? t().drop.release : t().drop.out}</span>
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
