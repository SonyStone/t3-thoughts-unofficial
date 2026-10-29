import { For, Show } from "solid-js";
import { vocabulary } from "virtual:content";
import { tagCounts } from "./search";
import { t } from "./i18n";
import { describe, NAMESPACES, namespaceKey, Tag } from "./Tag";

/** All tags by namespace with counts and descriptions from tags.yaml. */
export default function TagsPage() {
  const groups = NAMESPACES.map((ns) => ({
    ns,
    tags: tagCounts.filter(([tag]) => namespaceKey(tag) === ns),
  })).filter((group) => group.tags.length > 0);

  return (
    <section class="page">
      <h2>{t().tagsPage.title}</h2>
      <p class="muted">
        {t().tagsPage.help} <code>model:*, -product:codex</code>
      </p>
      <For each={groups}>
        {(group) => (
          <div class="tag-group">
            <h3 data-ns={group.ns}>
              {t().namespaces[group.ns]}
              <Show when={describe(vocabulary.namespaces[group.ns])}>
                {(about) => <span class="muted small"> — {about()}</span>}
              </Show>
            </h3>
            <ul class="tag-list">
              <For each={group.tags}>
                {([tag, count]) => (
                  <li>
                    <Tag tag={tag} count={count} />
                    <Show when={describe(vocabulary.tags[tag])}>{(about) => <span class="muted small">{about()}</span>}</Show>
                  </li>
                )}
              </For>
            </ul>
          </div>
        )}
      </For>
    </section>
  );
}
