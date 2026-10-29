import { createMemo, createSignal, For, onSettled, Show } from "solid-js";
import { applyTag, toClauses, toQuery, type Clause, type Term } from "./clauses";
import { t } from "./i18n";
import { route, setQuery } from "./route";
import { suggest } from "./search";
import { namespaceKey } from "./Tag";
import TagCloud from "./TagCloud";
import { openTagMenu } from "./TagMenu";

/**
 * The search box: the query as chips (AND between chips, OR inside one), then a text
 * field with tag autocomplete. Enter or a comma turns the text into a chip, Backspace on
 * an empty field takes the last chip back; a chip click opens the and/or/not menu.
 * `/` and ⌘K focus it from anywhere. Once it sticks to the top, focusing it shows the
 * tag cloud in a dropdown.
 */
export default function SearchBox(props: { stuck: boolean }) {
  let input: HTMLInputElement | undefined;
  const [draft, setDraft] = createSignal("");
  const [focused, setFocused] = createSignal(false);
  const [active, setActive] = createSignal(0);

  const clauses = createMemo(() => toClauses(route().q));
  const options = createMemo(() => (focused() ? suggest(draft().replace(/^[-!]/, "")) : []));
  const showCloud = () => focused() && props.stuck && !draft().trim();

  const commit = (text: string) => {
    const value = text.trim().replace(/,$/, "").trim();
    if (!value) return;
    const q = route().q;
    // a negated word goes through the menu logic (no duplicates); other text is appended as is
    setQuery(/^[-!]\S+$/.test(value) ? applyTag(q, value.slice(1), "exclude") : q ? `${q}, ${value}` : value);
    setDraft("");
    setActive(0);
  };

  const pick = (tag: string) => {
    const negate = /^[-!]/.test(draft());
    setQuery(applyTag(route().q, tag, negate ? "exclude" : "and"));
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
    }
  };

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

  const TermChip = (chip: { term: Term }) => (
    <button
      class={{ chip: true, neg: chip.term.neg }}
      data-ns={namespaceKey(chip.term.raw)}
      onClick={(event) => openTagMenu(event, chip.term.raw)}
      onContextMenu={(event) => openTagMenu(event, chip.term.raw)}
    >
      {chip.term.raw}
    </button>
  );

  return (
    <div class={{ search: true, focused: focused() }}>
      <div class="search-field" onClick={() => input?.focus()}>
        <svg class="search-icon" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M13 13l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <For each={clauses()}>
          {(clause: Clause, index) => (
            <>
              <Show when={index() > 0}>
                <span class="chip-op">and</span>
              </Show>
              <Show
                when={!("raw" in clause) && clause}
                fallback={<span class="chip raw">{(clause as { raw: string }).raw}</span>}
              >
                {(group) => (
                  <span class={{ "chip-group": group().terms.length > 1 }}>
                    <For each={group().terms}>
                      {(term, termIndex) => (
                        <>
                          <Show when={termIndex() > 0}>
                            <span class="chip-op">or</span>
                          </Show>
                          <TermChip term={term} />
                        </>
                      )}
                    </For>
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
          onInput={(event) => {
            setDraft(event.currentTarget.value);
            setActive(0);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit(draft());
          }}
          onKeyDown={onKeyDown}
        />
        <Show when={route().q}>
          <button
            class="search-clear"
            aria-label="×"
            onClick={(event) => {
              event.stopPropagation();
              setQuery("");
            }}
          >
            ×
          </button>
        </Show>
        <kbd class="search-kbd">⌘K</kbd>
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
