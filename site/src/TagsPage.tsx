import { scrollBehavior } from "./motion";
import { createMemo, createSignal, For, Show } from "solid-js";
import { vocabulary } from "virtual:content";
import { tagCounts } from "./search";
import { t } from "./i18n";
import { radioKeys, radioTab } from "./radios";
import { describe, NAMESPACES, namespaceKey, Tag } from "./Tag";

type Order = "count" | "name";

const bareName = (tag: string) => tag.slice(tag.indexOf(":") + 1);

/** A description that only repeats the name ("Apple" for company:apple) says nothing. */
function about(tag: string): string | undefined {
  const text = describe(vocabulary.tags[tag]);
  // letters of any script: "модели Claude вообще" is more than "claude"
  const bare = (words: string) => words.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return text && bare(text) !== bare(bareName(tag)) ? text : undefined;
}

/**
 * All tags by namespace: an index of namespaces on the side, a filter and an order on top,
 * and per tag its description and how often it is used.
 */
// kept across visits: a tag clicked here opens the feed, and Back finds the page as it was left
const [filter, setFilter] = createSignal("");
const [order, setOrder] = createSignal<Order>("count");

export default function TagsPage() {
  const groups = createMemo(() => {
    const needle = filter().trim().toLowerCase();
    return NAMESPACES.map((ns) => {
      const tags = tagCounts.filter(
        ([tag]) =>
          namespaceKey(tag) === ns &&
          (!needle || tag.includes(needle) || (describe(vocabulary.tags[tag]) ?? "").toLowerCase().includes(needle)),
      );
      return { ns, tags: order() === "name" ? [...tags].sort((a, b) => bareName(a[0]).localeCompare(bareName(b[0]))) : tags };
    }).filter((group) => group.tags.length > 0);
  });
  const total = createMemo(() => groups().reduce((sum, group) => sum + group.tags.length, 0));

  return (
    <section class="page wide tags-page">
      <header class="page-head">
        <h1>{t().tagsPage.title}</h1>
        <p class="muted">
          {t().tagsPage.help} <code class="nowrap">model:* -product:codex</code>
        </p>
      </header>

      <div class="tags-layout">
        <nav class="tags-index" aria-label={t().tagsPage.groups}>
          <For each={groups()}>
            {(group) => (
              <a href={`#/tags`} data-ns={group.ns} onClick={(event) => {
                event.preventDefault();
                document.getElementById(`ns-${group.ns}`)?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
              }}>
                <span class="ns-mark" />
                {t().namespaces[group.ns]}
                <span class="tag-count">{group.tags.length}</span>
              </a>
            )}
          </For>
        </nav>

        <div class="tags-main">
          <div class="tags-tools">
            <input
              class="field"
              type="search"
              placeholder={t().tagsPage.filter}
              value={filter()}
              // tags are lower case, and a phone's keyboard should not capitalize or "fix" them
              autocapitalize="none"
              autocorrect="off"
              spellcheck={false}
              enterkeyhint="search"
              onInput={(event) => setFilter(event.currentTarget.value)}
              // Enter puts the keyboard away, so the tags it left are in sight
              onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
            />
            <div class="segmented" role="radiogroup" aria-label={t().tagsPage.order} onKeyDown={radioKeys}>
              <For each={["count", "name"] as Order[]}>
                {(mode) => (
                  <button role="radio" aria-checked={order() === mode ? "true" : "false"} tabindex={radioTab(order() === mode)} class={{ current: order() === mode }} onClick={() => setOrder(mode)}>
                    {t().tagsPage.orders[mode]}
                  </button>
                )}
              </For>
            </div>
            <span class="muted small">{t().tagsPage.shown(total())}</span>
          </div>

          <Show when={groups().length > 0} fallback={<p class="muted">{t().nothing}</p>}>
            <For each={groups()}>
              {(group) => (
                <section class="tag-group" id={`ns-${group.ns}`} data-ns={group.ns}>
                  <h2>
                    <span class="ns-mark" />
                    {t().namespaces[group.ns]}
                    <span class="tag-count">{group.tags.length}</span>
                  </h2>
                  <Show when={describe(vocabulary.namespaces[group.ns]) ?? t().tagsPage.about[group.ns]}>{(about) => <p class="muted small group-about">{about()}</p>}</Show>
                  <Show
                    when={group.tags.some(([tag]) => describe(vocabulary.tags[tag]))}
                    fallback={
                      <div class="tag-cloud">
                        <For each={group.tags}>{([tag, count]) => <Tag tag={tag} count={count} />}</For>
                      </div>
                    }
                  >
                    <ul class="tag-rows">
                      <For each={group.tags}>
                        {([tag, count]) => (
                          <li>
                            <Tag tag={tag} />
                            <span class={{ "tag-about": true, none: !about(tag) }}>{about(tag) ?? "—"}</span>
                            <span class="tag-freq-count">{count}</span>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </section>
              )}
            </For>
          </Show>
        </div>
      </div>
    </section>
  );
}
