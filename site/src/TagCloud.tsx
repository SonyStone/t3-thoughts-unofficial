import { For, Show } from "solid-js";
import { entries, type Kind } from "./content";
import { t } from "./i18n";
import { tagCounts } from "./search";
import { namespaceKey, Tag } from "./Tag";

const TOPICAL = new Set(["product", "model", "company", "tech", "sponsor", "topic"]);
const KINDS: Kind[] = ["video", "post", "reply", "quote", "repost"];

const kindCounts = KINDS.map((kind) => [`kind:${kind}`, entries.filter((entry) => entry.items.some((item) => item.kind === kind)).length] as const)
  .filter(([, count]) => count > 0);

const topical = tagCounts.filter(([tag]) => TOPICAL.has(namespaceKey(tag)));

const groups = [
  { key: "popular", tags: topical.slice(0, 14), short: topical.slice(0, 10) },
  { key: "kind", tags: kindCounts, short: kindCounts },
  { key: "mood", tags: tagCounts.filter(([tag]) => namespaceKey(tag) === "mood"), short: undefined },
  { key: "format", tags: tagCounts.filter(([tag]) => namespaceKey(tag) === "format"), short: undefined },
] as const;

/**
 * Tags to start a search from. Under the search box it stays short (popular and type);
 * in the dropdown of the stuck search it shows mood and format too.
 */
export default function TagCloud(props: { short?: boolean }) {
  const shown = () =>
    groups
      .map((group) => ({ key: group.key, tags: props.short ? group.short : group.tags }))
      .filter((group): group is { key: (typeof groups)[number]["key"]; tags: (typeof groups)[number]["tags"] } => !!group.tags?.length);
  return (
    <div class="cloud">
      <For each={shown()}>
        {(group) => (
          <div class="cloud-row">
            <Show when={!props.short}>
              <span class="cloud-label">{t().cloud[group.key]}</span>
            </Show>
            <For each={group.tags}>{([tag, count]) => <Tag tag={tag} count={count} />}</For>
          </div>
        )}
      </For>
      <Show when={!props.short}>
        <a class="cloud-more" href="#/tags">
          {t().cloud.more}
        </a>
      </Show>
    </div>
  );
}
