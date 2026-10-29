import { createMemo, createSignal, For, Show } from "solid-js";
import { vocabulary } from "virtual:content";
import { tagCounts } from "./search";
import { t } from "./i18n";
import { describe, NAMESPACES, namespaceKey, Tag } from "./Tag";

type Order = "count" | "name";

const bareName = (tag: string) => tag.slice(tag.indexOf(":") + 1);

/**
 * All tags by namespace: an index of namespaces on the side, a filter and an order on top,
 * and per tag its description and how often it is used.
 */
export default function TagsPage() {
  const [filter, setFilter] = createSignal("");
  const [order, setOrder] = createSignal<Order>("count");

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
                document.getElementById(`ns-${group.ns}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
              onInput={(event) => setFilter(event.currentTarget.value)}
            />
            <div class="segmented" role="radiogroup" aria-label={t().tagsPage.order}>
              <For each={["count", "name"] as Order[]}>
                {(mode) => (
                  <button role="radio" aria-checked={order() === mode ? "true" : "false"} class={{ current: order() === mode }} onClick={() => setOrder(mode)}>
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
                  <Show when={describe(vocabulary.namespaces[group.ns])}>{(about) => <p class="muted small group-about">{about()}</p>}</Show>
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
                            <span class="tag-about">{describe(vocabulary.tags[tag]) ?? ""}</span>
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
