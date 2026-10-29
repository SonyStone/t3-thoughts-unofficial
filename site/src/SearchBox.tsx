import { createMemo, createSignal, For, onSettled, Show } from "solid-js";
import { applyTag, dropTag, editTerm, moveTerm, toClauses, toQuery, type Clause, type Drop, type Term } from "./clauses";
import { allowDrop, beginDrag, dragged, endDrag, startDrag } from "./drag";
import { t } from "./i18n";
import { Icon } from "./icons";
import { currentQuery, route, setQuery } from "./route";
import { suggest } from "./search";
import { namespaceKey, TagLabel } from "./Tag";
import TagCloud from "./TagCloud";
import { openTagMenu } from "./TagMenu";

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
  const [draft, setDraft] = createSignal("");
  const [focused, setFocused] = createSignal(false);
  const [active, setActive] = createSignal(0);
  const [over, setOver] = createSignal<string | undefined>();

  const clauses = createMemo(() => toClauses(route().q));
  const options = createMemo(() => (focused() ? suggest(draft().replace(/^[-!]/, "")) : []));
  const showCloud = () => focused() && props.stuck && !draft().trim();

  const commit = (text: string) => {
    const value = text.trim().replace(/,$/, "").trim();
    if (!value) return;
    const q = currentQuery();
    // a negated word goes through the menu logic (no duplicates); other text joins as its own clauses
    setQuery(/^[-!]\S+$/.test(value) ? applyTag(q, value.slice(1), "exclude") : toQuery([...toClauses(q), ...toClauses(value)]));
    setDraft("");
    setActive(0);
  };

  const pick = (tag: string) => {
    const negate = /^[-!]/.test(draft());
    setQuery(applyTag(currentQuery(), tag, negate ? "exclude" : "and"));
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
    } else if (event.key === "Enter" || event.key === "," || (event.key === " " && draft().trim() && !openQuote(draft()))) {
      event.preventDefault();
      commit(draft());
    }
  };

  // pasted "opus -codex": every finished word becomes a chip, the last one stays in the field
  const onInput = (value: string) => {
    const done = value.match(/^(.*\S)\s+(\S*)$/);
    if (done && !openQuote(done[1])) {
      commit(done[1]);
      setDraft(done[2]);
    } else {
      setDraft(value);
    }
    setActive(0);
  };

  const drop = (event: DragEvent, to: Drop | "negate" | "remove") => {
    event.preventDefault();
    event.stopPropagation();
    place(to);
  };

  const place = (to: Drop | "negate" | "remove") => {
    const what = dragged();
    setOver(undefined);
    endDrag();
    if (!what) return;
    const q = currentQuery();
    if (what.kind === "tag") {
      if (to === "remove") return;
      setQuery(to === "negate" ? applyTag(q, what.tag, "exclude") : dropTag(q, what.tag, to));
      return;
    }
    const at = { clause: what.clause, term: what.term };
    setQuery(to === "negate" || to === "remove" ? editTerm(q, at, to) : moveTerm(q, at, to));
  };

  // every drop place by its key, so a finger drag can find what is under it (data-drop)
  const targets = new Map<string, Drop | "negate" | "remove">();
  const target = (key: string, to: Drop | "negate" | "remove") => (targets.set(key, to), {
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
    return () => window.removeEventListener("keydown", focusShortcut);
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
        setOver(keyAt(event.clientX, event.clientY));
      },
      onPointerUp: (event: PointerEvent) => {
        if (!el || event.pointerType === "mouse") return;
        const key = moved ? keyAt(event.clientX, event.clientY) : undefined;
        el.style.transform = "";
        el.classList.remove("lifted");
        el = undefined;
        setOver(undefined);
        if (key && targets.has(key)) place(targets.get(key)!);
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

  const Slot = (slot: { before: number }) => (
    <span class={{ slot: true, over: over() === `slot-${slot.before}` }} {...target(`slot-${slot.before}`, { before: slot.before })} />
  );

  return (
    <div class={{ search: true, focused: focused(), dragging: !!dragged() }}>
      <div
        class={{ "search-field": true, over: over() === "field" }}
        onClick={() => input?.focus()}
        {...target("field", { before: clauses().length })}
      >
        <Icon name="search" class="search-icon" />
        <For each={clauses()}>
          {(clause: Clause, index) => (
            <>
              <Slot before={index()} />
              <Show
                when={!("raw" in clause) && clause}
                fallback={<span class="chip raw">{(clause as { raw: string }).raw}</span>}
              >
                {(group) => (
                  <span
                    class={{ clause: true, "chip-group": group().terms.length > 1, over: over() === `join-${index()}` }}
                    {...target(`join-${index()}`, { join: index() })}
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
                  </span>
                )}
              </Show>
            </>
          )}
        </For>
        <Slot before={clauses().length} />
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
        <Show when={dragged()?.kind === "chip"}>
          <span class={{ "drop-zone": true, over: over() === "negate" }} {...target("negate", "negate")}>
            {t().dropNegate}
          </span>
          <span class={{ "drop-zone": true, remove: true, over: over() === "remove" }} {...target("remove", "remove")}>
            {t().dropRemove}
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
