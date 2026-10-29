import { createMemo, createSignal, For, onSettled, Show } from "solid-js";
import Counts from "./Counts";
import { localized, type Entry, type Item } from "./content";
import { formatDate, lang, t } from "./i18n";
import { openEntry, route } from "./route";
import { chapterMatcher } from "./search";
import { sortTags, Tag } from "./Tag";
import { VideoMap } from "./Video";
import avatar from "../../assets/theo-avatar.png?url";

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
const COLUMN = 380;
const GAP = 16;
const TAGS_ON_TILE = 5;

/** Theo's own words in an entry: his text, or for a repost the post he shared. */
function words(item: Item): { text?: string; by?: string } {
  if (item.kind === "repost" && item.quoted && item.quoted !== "unavailable") {
    return { text: item.quoted.text, by: item.quoted.author };
  }
  return { text: item.text };
}

/** A rough height in pixels, enough to keep columns even without measuring the DOM. */
function estimate(entry: Entry): number {
  const item = entry.latest;
  const text = words(item).text ?? "";
  const parent = item.parent && item.parent !== "unavailable" ? 50 : 0;
  const media = item.media.length > 0 || item.kind === "video" ? 190 : 0;
  return 150 + Math.min(text.length, 360) * 0.45 + parent + media;
}

/** Entries laid into as many columns as fit, each into the shortest one, so reading order stays left to right. */
function useColumns(list: () => Entry[]) {
  const [width, setWidth] = createSignal(1200);
  let grid: HTMLDivElement | undefined;
  onSettled(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    if (grid) observer.observe(grid);
    return () => observer.disconnect();
  });
  const columns = createMemo(() => {
    const count = Math.max(1, Math.floor((width() + GAP) / (COLUMN + GAP)));
    const result: Entry[][] = Array.from({ length: count }, () => []);
    const heights = new Array(count).fill(0);
    for (const entry of list()) {
      const shortest = heights.indexOf(Math.min(...heights));
      result[shortest].push(entry);
      heights[shortest] += estimate(entry);
    }
    return result;
  });
  return { columns, ref: (el: HTMLDivElement) => (grid = el) };
}

function Tile(props: { entry: Entry }) {
  const item = () => props.entry.latest;
  const text = () => words(item());
  const parent = () => (item().parent && item().parent !== "unavailable" ? (item().parent as Exclude<Item["parent"], "unavailable" | undefined>) : undefined);
  const mood = () => item().ownTags.find((tag) => tag.startsWith("mood:"));
  const tags = () =>
    sortTags([...new Set(props.entry.items.flatMap((each) => each.ownTags))])
      .filter((tag) => !tag.startsWith("mood:") && !tag.startsWith("format:"))
      .slice(0, TAGS_ON_TILE);
  const weight = () => Math.max(...props.entry.items.map((each) => each.weight));
  const matcher = createMemo(() => chapterMatcher(route().q));

  return (
    <article
      class={{ tile: true, video: item().kind === "video" }}
      data-weight={weight()}
      tabindex="0"
      onClick={() => openEntry(item().id)}
      onKeyDown={(event) => event.key === "Enter" && openEntry(item().id)}
    >
      <div class="tile-meta">
        <img class="avatar tiny" src={avatar} alt="" />
        <span>
          {t().kind[item().kind]} · {formatDate(item().createdAt, DATE_FORMAT)}
        </span>
        <Show when={mood()}>{(tag) => <Tag tag={tag()} />}</Show>
      </div>
      <h3>
        <Show when={weight() >= 3}>
          <span class="star" title={t().main}>★</span>
        </Show>
        {localized(item(), lang()).title}
      </h3>

      <Show when={item().kind === "video"}>
        <img class="tile-thumb" src={`https://i.ytimg.com/vi/${item().id}/hqdefault.jpg`} loading="lazy" alt="" />
        <Show when={item().chapters}>
          <VideoMap item={item()} matches={(chapter) => matcher()(chapter.tags)} />
        </Show>
      </Show>

      <Show when={parent()}>
        {(post) => (
          <p class="tile-parent">
            <strong>{post().name ?? post().author}</strong> {post().text}
          </p>
        )}
      </Show>
      <Show when={text().text}>
        {(body) => (
          <p class="tile-text">
            <Show when={text().by}>
              <span class="muted">{text().by} · </span>
            </Show>
            {body()}
          </p>
        )}
      </Show>
      <Show when={item().kind !== "video" && item().media[0]}>
        {(url) => <img class="tile-thumb" src={url()} loading="lazy" alt="" />}
      </Show>
      <Show when={props.entry.items.length > 1}>
        <p class="tile-thread muted small">{t().tile.more(props.entry.items.length - 1)}</p>
      </Show>

      <Counts metrics={item().metrics} />
      <div class="tags">
        <For each={tags()}>{(tag) => <Tag tag={tag} />}</For>
      </div>
    </article>
  );
}

export default function Tiles(props: { entries: Entry[] }) {
  const { columns, ref } = useColumns(() => props.entries);
  return (
    <div class="tiles" ref={ref}>
      <For each={columns()}>
        {(column) => (
          <div class="tile-column">
            <For each={column}>{(entry) => <Tile entry={entry} />}</For>
          </div>
        )}
      </For>
    </div>
  );
}
