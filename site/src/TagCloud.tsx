import { route, withQuery } from "./route";
import { createMemo, For } from "solid-js";
import { entries, type Kind } from "./content";
import { t } from "./i18n";
import { CLOUD_SORTS, cloudSort, setCloudSort, type CloudSort } from "./prefs";
import { radioKeys, radioTab } from "./radios";
import { search, tagCounts, tagLastSeen } from "./search";
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
    <div class="segmented small-seg" role="radiogroup" aria-label={t().cloud.sort} onKeyDown={radioKeys}>
      <For each={CLOUD_SORTS}>
        {(sort) => (
          <button
            role="radio"
            aria-checked={cloudSort() === sort ? "true" : "false"}
            tabindex={radioTab(cloudSort() === sort)}
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

const days = [...new Set(entries.map((entry) => entry.day))].sort().reverse();
const byWeight = (min: number) => entries.filter((entry) => entry.items.some((item) => item.weight >= min)).length;

/**
 * Quick terms that are not tags: how to order, which rating, which day. Sort, weight and
 * date are exclusive, so a click swaps one for another (see clauses.ts).
 */
const quick: { key: "sortBy" | "rating" | "day"; tags: [string, number | undefined][] }[] = [
  { key: "sortBy", tags: [["sort:likes", undefined], ["sort:views", undefined]] },
  { key: "rating", tags: [["weight:3", byWeight(3)], ["weight:>=1", byWeight(1)]] },
  { key: "day", tags: days.slice(0, 5).map((day) => [`date:${day}`, search(`date:${day}`).length]) },
];

/**
 * Tags to start a search from, all of them, in the search's dropdown (on a phone, its editing
 * screen): there is no cloud on the page itself, the posts come right after the search.
 */
export default function TagCloud() {
  const groups = createMemo(() =>
    [
      { key: "popular", tags: ordered(topical, cloudSort(), topical.length) as [string, number | undefined][] },
      { key: "kind", tags: kindCounts as [string, number | undefined][] },
      // a quick term that finds nothing (no key posts yet) is left out
      ...quick.map((group) => ({ ...group, tags: group.tags.filter(([, count]) => count !== 0) })),
      { key: "mood", tags: ordered(tagCounts.filter(([tag]) => namespaceKey(tag) === "mood"), cloudSort(), 20) },
      { key: "format", tags: ordered(tagCounts.filter(([tag]) => namespaceKey(tag) === "format"), cloudSort(), 20) },
      { key: "people", tags: ordered(tagCounts.filter(([tag]) => namespaceKey(tag) === "person"), cloudSort(), 60) },
    ].filter((group) => group.tags.length > 0),
  );
  return (
    <div class="cloud">
      <div class="cloud-bar">
        <CloudSortSwitch />
        <a class="cloud-more" href={withQuery("/tags", route().q)}>
          {t().cloud.page}
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
