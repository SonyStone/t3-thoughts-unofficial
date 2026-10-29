import { createMemo, createSignal, For, onSettled, Show } from "solid-js";
import { vocabulary } from "virtual:content";
import { applyTag, hasTag, toClauses, type TagAction } from "./clauses";
import { t } from "./i18n";
import { currentQuery, route, setQuery } from "./route";
import { relatedTags, similarTags } from "./search";
import { describe, namespaceKey, Tag, TagLabel } from "./Tag";

type Open = { tag: string; x: number; y: number };

const [menu, setMenu] = createSignal<Open | undefined>();
const [top, setTop] = createSignal(0);

const WIDTH = 340;

/** Right-click (or a chip click) on a tag anywhere opens one shared menu. */
export function openTagMenu(event: MouseEvent, tag: string) {
  event.preventDefault();
  event.stopPropagation();
  setTop(0);
  setMenu({ tag, x: Math.max(8, Math.min(event.clientX, window.innerWidth - WIDTH - 8)), y: event.clientY });
}

const ACTIONS: TagAction[] = ["and", "or", "exclude", "only", "remove"];
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
                      <span class={{ chip: true, neg: term.neg, focus: same(term.raw) }} data-ns={namespaceKey(term.raw)}>
                        <TagLabel tag={term.raw} />
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

  onSettled(() => {
    const close = (event: Event) => {
      if (panel && event.target instanceof Node && panel.contains(event.target)) return;
      setMenu(undefined);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenu(undefined);
    const onNavigate = () => setMenu(undefined);
    window.addEventListener("hashchange", onNavigate);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("hashchange", onNavigate);
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  });

  // every action with the query it leads to; actions that change nothing, or repeat another, drop out
  const choices = createMemo(() => {
    const open = menu();
    if (!open) return [];
    const q = currentQuery();
    const seen = new Set([q]);
    return ACTIONS.map((action) => ({ action, query: applyTag(q, open.tag, action) })).filter(({ query }) => {
      if (seen.has(query)) return false;
      seen.add(query);
      return true;
    });
  });
  // tags already in the search say nothing new next to it
  const related = createMemo(() => (menu() ? relatedTags(menu()!.tag, 10).filter(([tag]) => !hasTag(route().q, tag)).slice(0, 6) : []));
  const similar = createMemo(() => (menu() ? similarTags(menu()!.tag) : []));

  // keep the panel on screen: below the pointer when it fits, above otherwise
  const place = (el: HTMLDivElement) => {
    panel = el;
    queueMicrotask(() => {
      const open = menu();
      if (!open || !panel) return;
      const height = panel.offsetHeight;
      setTop(open.y + height + 8 > window.innerHeight ? Math.max(8, open.y - height) : open.y);
    });
  };

  return (
    <Show when={menu()}>
      {(open) => (
        <div class="tag-menu" role="menu" ref={place} style={{ left: `${open().x}px`, top: `${top() || open().y}px`, width: `${WIDTH}px` }}>
          <div class="tag-menu-head">
            <span class="chip" data-ns={namespaceKey(open().tag)}>
              <TagLabel tag={open().tag} />
            </span>
            <Show when={describe(vocabulary.tags[open().tag])}>{(about) => <p class="muted small">{about()}</p>}</Show>
          </div>
          <div class="tag-menu-actions">
            <For each={choices()}>
              {(choice) => (
                <button
                  role="menuitem"
                  title={t().tagMenu[choice.action]}
                  aria-label={t().tagMenu[choice.action]}
                  onClick={() => {
                    setQuery(choice.query);
                    setMenu(undefined);
                  }}
                >
                  <QueryPreview query={choice.query} tag={open().tag} />
                </button>
              )}
            </For>
          </div>
          <Show when={related().length > 0}>
            <div class="tag-menu-section">
              <span class="tag-menu-label">{t().tagMenu.related}</span>
              <div class="tag-menu-tags">
                <For each={related()}>{([tag, count]) => <Tag tag={tag} count={count} />}</For>
              </div>
            </div>
          </Show>
          <Show when={similar().length > 0}>
            <div class="tag-menu-section">
              <span class="tag-menu-label">{t().tagMenu.similar}</span>
              <div class="tag-menu-tags">
                <For each={similar()}>{([tag, count]) => <Tag tag={tag} count={count} />}</For>
              </div>
            </div>
          </Show>
        </div>
      )}
    </Show>
  );
}
