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
    setQuery(/^[-!]\S+$/.test(value) ? applyTag(q, value.slice(1), "exclude") : toQuery([...toClauses(q), ...toClauses(value)]));
    setDraft("");
    setActive(0);
  };

  const pick = (term: string) => {
    const negate = /^[-!]/.test(term) || /^[-!]/.test(draft());
    setQuery(applyTag(currentQuery(), term.replace(/^[-!]/, ""), negate ? "exclude" : "and"));
    setDraft("");
    setActive(0);
    input?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const list = options();
    if (event.key === "Escape") {
      input?.blur();
    } else if (event.key === "Backspace" && !draft() && clauses().length > 0) {
      event.preventDefault();
      const last = clauses().at(-1)!;
      setQuery(toQuery(clauses().slice(0, -1)));
      setDraft("raw" in last ? last.raw : toQuery([last]));
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
    setOver(undefined);
    endDrag();
    if (!what) return;
    const q = currentQuery();
    if (what.kind === "tag") {
      if (to === "remove") return;
      if (to === "only") setQuery(what.tag);
      else setQuery(to === "negate" ? applyTag(q, what.tag, "exclude") : dropTag(q, what.tag, to));
      return;
    }
    const at = { clause: what.clause, term: what.term };
    if (to === "only") setQuery(`${what.neg ? "-" : ""}${what.raw}`);
    else setQuery(to === "negate" || to === "remove" ? editTerm(q, at, to) : moveTerm(q, at, to));
  };

  /** Whether the thing being dragged already is this clause, so joining it with itself means nothing. */
  const carries = (index: number) => {
    const what = dragged();
    const clause = clauses()[index];
    if (!what || !clause || "raw" in clause) return false;
    if (what.kind === "chip") return what.clause === index && clause.terms.length === 1;
    return clause.terms.some((term) => term.raw.toLowerCase() === what.tag.toLowerCase());
  };

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
      if (dragged()?.kind !== "chip" || !outside(event.clientX, event.clientY)) return;
      event.preventDefault();
      setOver("outside");
    };
    const dropOnPage = (event: DragEvent) => {
      if (dragged()?.kind !== "chip" || !outside(event.clientX, event.clientY)) return;
      event.preventDefault();
      place("remove");
    };
    window.addEventListener("dragover", overPage);
    window.addEventListener("drop", dropOnPage);
    return () => {
      window.removeEventListener("keydown", focusShortcut);
      window.removeEventListener("dragover", overPage);
      window.removeEventListener("drop", dropOnPage);
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
      class={{ chip: true, neg: chip.term.neg }}
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
        onClick={() => input?.focus()}
        {...target("field", { before: clauses().length })}
      >
        <Icon name="search" class="search-icon" />
        <For each={clauses()}>
          {(clause: Clause, index) => (
            <>
              <Show
                when={!("raw" in clause) && clause}
                fallback={<span class="chip raw">{(clause as { raw: string }).raw}</span>}
              >
                {(group) => (
                  <span
                    class={{ clause: true, "chip-group": group().terms.length > 1, over: over() === `join-${index()}` }}
                  >
                    <For each={group().terms}>
                      {(term, termIndex) => (
                        <>
                          <Show when={termIndex() > 0}>
                            <span class="chip-op">{t().or}</span>
                          </Show>
                          <TermChip term={term} clause={index()} index={termIndex()} />
                        </>
                      )}
                    </For>
                    {/* above a chip: add next to it ("and"); below it: join it ("or"). Not on the chip being carried. */}
                    <Show when={dragged() && !carries(index())}>
                      <span class={{ flyout: true, and: true, over: over() === `after-${index()}` }} {...target(`after-${index()}`, { before: index() + 1 })}>
                        {t().drop.and}
                      </span>
                      <span class={{ flyout: true, or: true, over: over() === `join-${index()}` }} {...target(`join-${index()}`, { join: index() })}>
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
            setFocused(false);
            commit(draft());
          }}
          onKeyDown={onKeyDown}
        />
        {/* while something is dragged, the free part of the box becomes big zones, one per action */}
        <Show when={dragged()}>
          <span class="drop-board">
            <span class={{ "drop-zone": true, over: over() === "add" }} {...target("add", { before: clauses().length })}>
              <b>+</b> {t().drop.add}
            </span>
            <span class={{ "drop-zone": true, negate: true, over: over() === "negate" }} {...target("negate", "negate")}>
              <b>−</b> {t().drop.negate}
            </span>
            <span class={{ "drop-zone": true, over: over() === "only" }} {...target("only", "only")}>
              <b>=</b> {t().drop.only}
            </span>
            <Show when={dragged()?.kind === "chip"}>
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
                    <span>{tag}</span>
                    <Show when={count >= 0}>
                      <span class="tag-count">{count}</span>
                    </Show>
                    <Show when={/^-?text:/.test(tag)}>
                      <span class="tag-count">{t().searchText}</span>
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
