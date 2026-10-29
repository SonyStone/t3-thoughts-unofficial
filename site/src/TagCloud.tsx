import { createMemo, For, Show } from "solid-js";
import { entries, type Kind } from "./content";
import { t } from "./i18n";
import { CLOUD_SORTS, cloudSort, setCloudSort, type CloudSort } from "./prefs";
import { tagCounts, tagLastSeen } from "./search";
import { namespaceKey, Tag } from "./Tag";

const TOPICAL = new Set(["product", "model", "company", "tech", "sponsor", "topic"]);
const KINDS: Kind[] = ["video", "post", "reply", "quote", "repost"];

const kindCounts = KINDS.map((kind) => [`kind:${kind}`, entries.filter((entry) => entry.items.some((item) => item.kind === kind)).length] as [string, number])
  .filter(([, count]) => count > 0);

const topical = tagCounts.filter(([tag]) => TOPICAL.has(namespaceKey(tag)));
const bareName = (tag: string) => tag.slice(tag.indexOf(":") + 1);

/** Popular: most used. Recent: last used first. A–Z: the popular ones by name, easier to scan. */
function ordered(list: [string, number][], sort: CloudSort, limit: number): [string, number][] {
  if (sort === "recent") {
    return [...list].sort((a, b) => (tagLastSeen.get(b[0]) ?? 0) - (tagLastSeen.get(a[0]) ?? 0) || b[1] - a[1]).slice(0, limit);
  }
  const popular = list.slice(0, limit);
  return sort === "name" ? [...popular].sort((a, b) => bareName(a[0]).localeCompare(bareName(b[0]))) : popular;
}

export function CloudSortSwitch() {
  return (
    <div class="segmented small-seg" role="radiogroup" aria-label={t().cloud.sort}>
      <For each={CLOUD_SORTS}>
        {(sort) => (
          <button
            role="radio"
            aria-checked={cloudSort() === sort ? "true" : "false"}
            class={{ current: cloudSort() === sort }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setCloudSort(sort)}
          >
            {t().cloud.sorts[sort]}
          </button>
        )}
      </For>
    </div>
  );
}

/**
 * Tags to start a search from. Under the search box it stays short (topics and type);
 * in the dropdown of the stuck search it shows mood and format too.
 */
export default function TagCloud(props: { short?: boolean }) {
  const groups = createMemo(() =>
    [
      { key: "popular", tags: ordered(topical, cloudSort(), props.short ? 14 : 24) },
      { key: "kind", tags: kindCounts },
      ...(props.short
        ? []
        : [
            { key: "mood", tags: ordered(tagCounts.filter(([tag]) => namespaceKey(tag) === "mood"), cloudSort(), 20) },
            { key: "format", tags: ordered(tagCounts.filter(([tag]) => namespaceKey(tag) === "format"), cloudSort(), 20) },
          ]),
    ].filter((group) => group.tags.length > 0),
  );
  return (
    <div class={{ cloud: true, short: !!props.short }}>
      <div class="cloud-bar">
        <CloudSortSwitch />
        <a class="cloud-more" href="#/tags">
          {t().cloud.more}
        </a>
      </div>
      <For each={groups()}>
        {(group) => (
          <div class="cloud-row">
            <span class="cloud-label">{t().cloud[group.key as "popular"]}</span>
            <div class="cloud-tags">
              <For each={group.tags}>{([tag, count]) => <Tag tag={tag} count={count} />}</For>
            </div>
          </div>
        )}
      </For>
    </div>
  );
}
