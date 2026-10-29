import { createSignal, For, onSettled, Show } from "solid-js";
import { applyTag, type TagAction } from "./clauses";
import { t } from "./i18n";
import { route, setQuery } from "./route";

type Open = { tag: string; x: number; y: number };

const [menu, setMenu] = createSignal<Open | undefined>();

/** Right-click (or a chip click) on a tag anywhere opens one shared menu. */
export function openTagMenu(event: MouseEvent, tag: string) {
  event.preventDefault();
  event.stopPropagation();
  setMenu({ tag, x: Math.min(event.clientX, window.innerWidth - 220), y: Math.min(event.clientY, window.innerHeight - 220) });
}

const ACTIONS: TagAction[] = ["only", "and", "or", "exclude", "remove"];

export default function TagMenu() {
  onSettled(() => {
    const close = () => setMenu(undefined);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  });

  return (
    <Show when={menu()}>
      {(open) => (
        <div class="tag-menu" role="menu" style={{ left: `${open().x}px`, top: `${open().y}px` }}>
          <div class="tag-menu-title">{open().tag}</div>
          <For each={ACTIONS}>
            {(action) => (
              <button
                role="menuitem"
                onClick={() => {
                  setQuery(applyTag(route().q, open().tag, action));
                  setMenu(undefined);
                }}
              >
                {t().tagMenu[action]}
              </button>
            )}
          </For>
        </div>
      )}
    </Show>
  );
}
