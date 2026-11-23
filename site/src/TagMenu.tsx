import { flush, createEffect, createMemo, createSignal, For, onSettled, Show, untrack } from "solid-js";
import { vocabulary } from "virtual:content";
import { applyTag, toClauses, toQuery, type TagAction, uses } from "./clauses";
import { t } from "./i18n";
import { Icon } from "./icons";
import { dragged } from "./drag";
import { currentQuery, route, setQuery } from "./route";
import { relatedTags, similarTags } from "./search";
import { describe, namespaceKey, Tag, TagLabel } from "./Tag";

/** The menu hangs off the tag it was opened on: `above`/`below` are that tag's edges. */
type Open = {
  trigger: HTMLElement | null;
  tag: string;
  x: number;
  above: number;
  below: number;
  keyboard?: boolean;
  returnTo?: HTMLElement | null;
  /** The search box its tag was in, if any: the focus goes to its field when the chip is gone. */
  search?: Element | null;
  /**
   * Opened with the search in use (the focus in its field or its cloud, a tag of its open cloud, a
   * phone's editing screen): where the focus goes back to, to keep it in use. Nothing otherwise.
   */
  back?: HTMLElement | null;
  /** Where the tag it hangs off stood (for one opened from a tag in a menu, the first menu's tag). */
  anchorTop?: number;
  /** The arrows took the focus into it (opened with a press): it is the keys' too, and so is one opened from a tag in it. */
  keys?: boolean;
};
type Placement = { top: number; maxHeight?: number };

const [menu, setMenu] = createSignal<Open | undefined>();
/** The tag the open menu hangs off, if one is open. */
export const menuTrigger = () => {
  const open = menu();
  return open ? (open.returnTo ?? open.trigger) : null;
};
/**
 * A focus to put back once the page has caught up with a menu's change: any press since, or
 * another menu, means the reader has moved on, and it is dropped (the count changes).
 */
let pendingFocus = 0;
/** The last thing done was with the keys: a menu closed by them gives the focus back to its tag. */
let byKeys = false;
window.addEventListener("pointerdown", () => { pendingFocus++; byKeys = false; }, true);
window.addEventListener("keydown", () => (byKeys = true), true);
const [placement, setPlacement] = createSignal<Placement | undefined>();
const GAP = 6;

const WIDTH = 340;

/** Right-click (or a chip click) on a tag anywhere opens one shared menu. */
export function openTagMenu(event: MouseEvent, tag: string) {
  event.preventDefault();
  event.stopPropagation();
  // from the keys (Enter on a chip, Shift+F10): the focus goes into the menu and back. Not from a
  // pointer: a phone's editing screen keeps the focus in the field, and the keyboard up
  const keyboard = fromKeys || (event.type === "click" && event.detail === 0);
  openAt(event.currentTarget as HTMLElement | null, tag, event.clientX, event.clientY, keyboard);
}

let fromKeys = false;

/** Opens the menu off a tag, as a long press with a finger does (drag.ts, `onHeld`). */
export function openAt(el: HTMLElement | null, tag: string, clientX: number, clientY: number, keyboard = false) {
  pendingFocus++;
  // no menu in the middle of a drag (its keys, Enter on a chip, are the drag's then)
  if (dragged()) return;
  const rect = el?.getBoundingClientRect();
  // a tag in the open menu opens one of its own in place of it: closed, the focus goes back to
  // where the first one came from, not to a tag that went with it
  const before = menu();
  const nested = el?.closest(".tag-menu") && before ? before : undefined;
  const returnTo = nested ? (nested.returnTo ?? nested.trigger) : el;
  setPlacement(undefined);
  setMenu({
    returnTo,
    search: (returnTo ?? el)?.closest(".search") ?? before?.search,
    tag,
    trigger: el,
    x: rect?.left ?? clientX,
    above: rect?.top ?? clientY,
    below: rect?.bottom ?? clientY,
    // (one opened from a tag in a menu the keys were used in goes back as theirs did)
    keyboard: nested ? !!(nested.keyboard || nested.keys) : keyboard,
    back: nested ? nested.back : inUse(el),
    anchorTop: (returnTo ?? el)?.getBoundingClientRect().top,
  });
}

/** Where the focus goes back to from a menu opened off `el`, if the search it is in is in use. */
function inUse(el: HTMLElement | null): HTMLElement | null {
  const search = el?.closest(".search");
  if (!el || !search) return null;
  const at = document.activeElement as HTMLElement | null;
  const field = search.querySelector<HTMLElement>(".search-field input");
  const drop = search.querySelector(".search-drop");
  const using = search.classList.contains("editing") || at === field || !!drop?.contains(at) || !!drop?.contains(el);
  if (!using) return null;
  // (the focus left nowhere, as Safari's presses do: the field)
  return at && at !== document.body && search.contains(at) ? at : field;
}

/** Removing is not among them: it is a button of its own by the tag, said in words (see `removal`). */
const ACTIONS: TagAction[] = ["and", "or", "exclude", "only"];
/** Of a long query the preview shows the end, where the change happens. */
const SHOWN_CLAUSES = 3;

/** A query drawn as the search box draws it, small and not clickable. */
function QueryPreview(props: { query: string; tag: string }) {
  const clauses = () => toClauses(props.query);
  const shown = () => clauses().slice(-SHOWN_CLAUSES);
  const same = (raw: string) => raw.toLowerCase() === props.tag.toLowerCase();
  return (
    <span class="preview">
      <Show when={clauses().length > SHOWN_CLAUSES}>
        <span class="chip-op">…</span>
      </Show>
      <Show when={shown().length > 0} fallback={<span class="chip-op">{t().tagMenu.empty}</span>}>
        <For each={shown()}>
          {(clause) =>
            "raw" in clause ? (
              <span class="chip raw">{clause.raw}</span>
            ) : (
              <span class={{ "chip-group": clause.terms.length > 1 }}>
                <For each={clause.terms}>
                  {(term, index) => (
                    <>
                      <Show when={index() > 0}>
                        <span class="chip-op">{t().or}</span>
                      </Show>
                      <span class={{ chip: true, neg: term.neg, focus: same(term.raw), compound: !!term.all }} data-ns={term.all ? undefined : namespaceKey(term.raw)}>
                        {/* an "and" group: its tags one by one, not its text as one tag */}
                        <Show when={term.all} fallback={<TagLabel tag={term.raw} />}>
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
                      </span>
                    </>
                  )}
                </For>
              </span>
            )
          }
        </For>
      </Show>
    </span>
  );
}

export default function TagMenu() {
  let panel: HTMLDivElement | undefined;

  /**
   * Closes the menu, and the focus it had (or lost on the way) goes back, not to nowhere: opened
   * with the search in use, to where it was in the search then; opened from the keys, to its tag
   * (unless it went on with Tab); opened with a press, to the tag when the arrows took the focus
   * in. A click on one of its buttons, which focuses it in some browsers, is not that.
   */
  // ("search": only the search's own way back, for a menu that ends with a drag of one of its tags)
  const closeMenu = (refocus: boolean | "search" = true) => {
    const open = menu();
    if (!open) return;
    const inside = !!panel?.contains(document.activeElement);
    setMenu(undefined);
    const trigger = open.returnTo ?? open.trigger;
    if (!refocus || !trigger) return;
    // (read when it opened: by now the chip may be out of the page already)
    const search = open.search ?? trigger.closest(".search");
    const field = search?.querySelector<HTMLElement>(".search-field input");
    // (Safari's press on a button in it, or a tag in it pressed for a menu of its own, leaves the focus nowhere instead)
    const lost = !document.activeElement || document.activeElement === document.body;
    if (!inside && !lost) return;
    // (a menu of the keys closed with a click, by an action or a tag of it: no more than it was)
    const to = open.back ?? (refocus === true && byKeys && (open.keyboard || open.keys) ? trigger : null);
    if (!to) return;
    // at once, while the menu is still there to hand it over: the cloud a tag is in stays open
    // for it (the search hears a focus gone nowhere as the search left)
    if (to.isConnected) to.focus({ preventScroll: true });
    // and once the page has caught up with the change (the address changes a task later, the
    // page a frame after that): what the menu took out (a chip, Clear with the query) is gone,
    // and the search field takes it
    const mine = ++pendingFocus;
    setTimeout(() =>
      requestAnimationFrame(() => {
        const at = document.activeElement;
        if (mine !== pendingFocus || (at && at !== document.body)) return;
        (to.isConnected ? to : field)?.focus({ preventScroll: true });
      }),
    );
  };

  // a tag picked up (one of the menu's own, or any other): the menu steps aside, leaving the search
  // and its places to drop on in sight, and Escape to the drag; it goes when the drag ends. Out of
  // sight but still on the page: a finger dragging one of its tags keeps its touch going there.
  const aside = () => !!dragged();
  let wasDragging = false;
  createEffect(
    () => !!dragged(),
    (on) => {
      if (!on && wasDragging) untrack(() => closeMenu("search"));
      wasDragging = on;
    },
  );

  /** When Enter was last pressed in the menu: a tag of it followed with the keys gives the focus back. */
  let enteredAt = 0;

  onSettled(() => {
    const close = (event: Event) => {
      if (panel && event.target instanceof Node && panel.contains(event.target)) return;
      // a click elsewhere puts the focus where it was clicked (or nowhere): not back on the tag
      closeMenu(false);
    };
    const onKey = (event: KeyboardEvent) => {
      // while a drag is on, the keys are the drag's (Escape cancels it), and no menu opens
      if (dragged()) return;
      // the search's shortcut (/ outside a field, ⌘K or Ctrl K): the search is what is at hand now
      const typing = event.target instanceof Element && event.target.closest("input, textarea, [contenteditable]");
      if (menu() && ((event.key === "/" && !typing) || (event.code === "KeyK" && (event.metaKey || event.ctrlKey)))) {
        closeMenu(false);
        return;
      }
      if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
        const tag = event.target instanceof Element && event.target.closest(".tag, button.chip, .part");
        if (tag) {
          event.preventDefault();
          fromKeys = true;
          try {
            tag.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
          } finally {
            fromKeys = false;
          }
        }
        return;
      }
      const open = menu();
      if (!open) return;
      if (event.key === "Enter" && panel?.contains(document.activeElement)) enteredAt = performance.now();
      // Tab goes on from the tag the menu hangs off, as if the menu were not there, and it closes
      // (opened with a press and the focus still where it was: it closes, and Tab goes on from there)
      if (event.key === "Tab") {
        // (gone from the page at once: Firefox would Tab into it before it went)
        // (the focus lost on the way, a tag in it pressed for a menu of its own: from its tag too)
        const at = document.activeElement;
        if (!panel?.contains(at) && at && at !== document.body) {
          closeMenu(false);
          flush();
          return;
        }
        setMenu(undefined);
        flush();
        const back = open.returnTo ?? open.trigger;
        if (back?.isConnected) back.focus({ preventScroll: true });
        else open.search?.querySelector<HTMLElement>(".search-field input")?.focus({ preventScroll: true });
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeMenu();
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const items = Array.from(panel?.querySelectorAll<HTMLElement>("button, a[href]") ?? []);
        if (!items.length) return;
        event.preventDefault();
        event.stopPropagation();
        const index = items.indexOf(document.activeElement as HTMLElement);
        if (index < 0) open.keys = true;
        const down = event.key === "ArrowDown";
        // from outside the menu (opened with a press), down is its first item and up its last
        items[index < 0 ? (down ? 0 : items.length - 1) : (index + (down ? 1 : items.length - 1)) % items.length].focus();
      }
    };
    // the page changed under it (Back, a link elsewhere): its tag is no longer what is at hand
    // (an action of the menu closes it, focus and all, before its change comes in)
    // (in the middle of a drag of a tag of it, dropped on the search: the drag's end closes it)
    const onNavigate = () => !dragged() && closeMenu(performance.now() - enteredAt < 500);
    window.addEventListener("hashchange", onNavigate);
    // Back with the address as it was (the phone's search screen closing): a step all the same
    window.addEventListener("popstate", onNavigate);
    window.addEventListener("click", close);
    // a tag in it followed with a click, as with Enter: the address it changes is its doing
    // (heard first: a tag keeps its click to itself)
    const picked = (event: MouseEvent) => {
      if (panel && event.target instanceof Node && panel.contains(event.target)) enteredAt = performance.now();
    };
    window.addEventListener("click", picked, true);
    // a press elsewhere closes it before anything there can keep the click to itself (a post, a tag)
    const pressOutside = (event: PointerEvent) => {
      if (!menu()) return;
      if (!(panel && event.target instanceof Node && panel.contains(event.target))) close(event);
    };
    window.addEventListener("pointerdown", pressOutside, true);
    // only a scroll of the page moves the tag away; a tag row scrolled sideways or the menu itself does not
    // the page or a list scrolled (the phone's tag list) so the tag went up or down: the menu would
    // hang off nothing; a row scrolled sideways, or the menu itself, leaves it
    const onScroll = (event: Event) => {
      // (stepped aside for a drag, it waits for the drag's end)
      if (aside() || (event.target instanceof Node && panel?.contains(event.target))) return;
      const open = menu();
      // (one opened from a tag in a menu hangs off the first menu's tag: that one went with it)
      const anchor = open && (open.returnTo ?? open.trigger);
      if (open && anchor?.isConnected && open.anchorTop !== undefined && Math.abs(anchor.getBoundingClientRect().top - open.anchorTop) > 1) closeMenu();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKey, true);
    // the window got narrower or wider (a phone turned): the tag is elsewhere now; a keyboard
    // coming up changes only the height
    let width = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      if (menu()) closeMenu(false);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("pointerdown", pressOutside, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("hashchange", onNavigate);
      window.removeEventListener("popstate", onNavigate);
      window.removeEventListener("click", close);
      window.removeEventListener("click", picked, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKey, true);
    };
  });

  // every action with the query it leads to; actions that change nothing, or repeat another, drop out
  const choices = createMemo(() => {
    const open = menu();
    if (!open) return [];
    const q = currentQuery();
    // the same chips in another order find the same: that is no action either
    const key = (query: string) =>
      toClauses(query)
        .map((clause) => ("raw" in clause ? clause.raw : clause.terms.map((term) => toQuery([{ terms: [term] }])).sort().join(" || ")))
        .sort()
        .join("\n");
    const seen = new Set([key(q)]);
    return ACTIONS.map((action) => ({ action, query: applyTag(q, open.tag, action) })).filter(({ query }) => {
      if (seen.has(key(query))) return false;
      seen.add(key(query));
      return true;
    });
  });
  // the query without the tag, when the tag is in it at all (alone, negated or in a group); as a
  // preview it read "all entries" for the last chip, so it is a button by the tag instead
  const removal = createMemo(() => {
    const open = menu();
    if (!open) return undefined;
    const q = currentQuery();
    const query = applyTag(q, open.tag, "remove");
    // compared as the query is written back: an address with extra brackets is the same query
    return query === toQuery(toClauses(q)) ? undefined : { query };
  });
  // tags already in the search say nothing new next to it
  const related = createMemo(() => (menu() ? relatedTags(menu()!.tag, 10).filter(([tag]) => !uses(route().q, tag)).slice(0, 6) : []));
  const similar = createMemo(() => (menu() ? similarTags(menu()!.tag) : []));

  // below the tag when it fits; otherwise on the side with more room, never over the tag, scrolling if need be
  const place = (el: HTMLDivElement) => {
    panel = el;
    queueMicrotask(() => {
      const open = menu();
      if (!open || !panel) return;
      const height = panel.scrollHeight;
      // down to what is in sight: a phone's keyboard covers the bottom of the window
      const view = window.visualViewport;
      const bottom = view ? view.offsetTop + view.height : window.innerHeight;
      const room = { below: bottom - open.below - GAP - 8, above: open.above - GAP - 8 };
      if (height <= room.below) setPlacement({ top: open.below + GAP });
      else if (room.below >= room.above) setPlacement({ top: open.below + GAP, maxHeight: room.below });
      else setPlacement({ top: Math.max(8, open.above - GAP - height), maxHeight: room.above });
      flush();
      if (open.keyboard) panel.querySelector<HTMLElement>("button, a[href]")?.focus({ preventScroll: true });
    });
  };

  return (
    <Show when={menu()} keyed>
      {(open) => (
        <div
          class="tag-menu"
          role="menu"
          aria-label={open.tag}
          ref={place}
          // Tab past its last item: the focus has gone on, and the menu closes behind it
          onFocusOut={(event) => {
            const to = event.relatedTarget as Node | null;
            if (to && panel && !panel.contains(to)) closeMenu(false);
          }}
          style={{
            left: `clamp(8px, ${open.x}px, calc(100% - ${WIDTH + 8}px))`,
            top: `${placement()?.top ?? open.below + GAP}px`,
            "max-height": placement()?.maxHeight ? `${placement()!.maxHeight}px` : undefined,
            visibility: placement() && !aside() ? "visible" : "hidden",
            "pointer-events": aside() ? "none" : undefined,
            width: `min(${WIDTH}px, calc(100% - 16px))`,
          }}>
          <div class="tag-menu-head">
            <div class="tag-menu-title">
              <span class="chip" data-ns={namespaceKey(open.tag)}>
                <TagLabel tag={open.tag} />
              </span>
              <Show when={removal()}>
                {(removed) => (
                  <button
                    type="button"
                    class="tag-menu-remove"
                    role="menuitem"
                    onClick={() => {
                      setQuery(removed().query);
                      closeMenu();
                    }}
                  >
                    <Icon name="close" />
                    {t().tagMenu.remove}
                  </button>
                )}
              </Show>
            </div>
            <Show when={describe(vocabulary.tags[open.tag])}>{(about) => <p class="muted small">{about()}</p>}</Show>
          </div>
          <div class="tag-menu-actions">
            <For each={choices()}>
              {(choice) => (
                <button
                  role="menuitem"
                  title={t().tagMenu[choice.action]}
                  aria-label={`${t().tagMenu[choice.action]}: ${choice.query || t().says.all}`}
                  onClick={() => {
                    setQuery(choice.query);
                    closeMenu();
                  }}
                >
                  <span class="tag-menu-verb">{t().tagMenu.verbs[choice.action]}</span>
                  <QueryPreview query={choice.query} tag={open.tag} />
                </button>
              )}
            </For>
          </div>
          <Show when={related().length > 0}>
            <div class="tag-menu-section">
              <span class="tag-menu-label">{t().tagMenu.related}</span>
              <div class="tag-menu-tags">
                <For each={related()} keyed={([tag]) => tag}>{(item) => <Tag tag={item()[0]} count={item()[1]} />}</For>
              </div>
            </div>
          </Show>
          <Show when={similar().length > 0}>
            <div class="tag-menu-section">
              <span class="tag-menu-label">{t().tagMenu.similar}</span>
              <div class="tag-menu-tags">
                <For each={similar()} keyed={([tag]) => tag}>{(item) => <Tag tag={item()[0]} count={item()[1]} />}</For>
              </div>
            </div>
          </Show>
        </div>
      )}
    </Show>
  );
}
