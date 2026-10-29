import { createMemo, createSignal, For, onSettled, Show } from "solid-js";
import { localized, type Entry, type Item } from "./content";
import { formatDate, lang, t } from "./i18n";
import { openEntry, postHref, route } from "./route";
import { chapterMatcher } from "./search";
import { sortTags, Tag } from "./Tag";
import { VideoMap } from "./Video";
import { XCompact } from "./XPost";

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
const COLUMN = 380;
const GAP = 20;
const TAGS_ON_TILE = 5;

/** A rough height in pixels, enough to keep columns even without measuring the DOM. */
function estimate(entry: Entry): number {
  const item = entry.latest;
  const original = item.kind === "repost" && item.quoted && item.quoted !== "unavailable" ? item.quoted : undefined;
  const text = (original?.text ?? item.text ?? "").length;
  const parent = item.parent && item.parent !== "unavailable" ? 44 : 0;
  const media = item.media.length > 0 || item.kind === "video" ? 200 : 0;
  return 190 + Math.min(text, 300) * 0.5 + parent + media;
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

const weightOf = (entry: Entry) => Math.max(...entry.items.map((each) => each.weight));

/** Kind, time and Theo's mood: our line above the post, not part of it. */
export function EntryMeta(props: { item: Item }) {
  const mood = () => props.item.ownTags.find((tag) => tag.startsWith("mood:"));
  return (
    <div class="entry-meta">
      <span class="kind" data-kind={props.item.kind}>
        {t().kind[props.item.kind]}
      </span>
      <span>{formatDate(props.item.createdAt, DATE_FORMAT)}</span>
      <Show when={mood()}>{(tag) => <Tag tag={tag()} />}</Show>
    </div>
  );
}

function Title(props: { entry: Entry }) {
  return (
    <h3 class="entry-title">
      <Show when={weightOf(props.entry) >= 3}>
        <span class="star" title={t().main}>★</span>
      </Show>
      <a href={postHref(props.entry.latest.id)} onClick={(event) => event.stopPropagation()}>
        {localized(props.entry.latest, lang()).title}
      </a>
    </h3>
  );
}

function TileTags(props: { entry: Entry }) {
  const tags = () =>
    sortTags([...new Set(props.entry.items.flatMap((each) => each.ownTags))])
      .filter((tag) => !tag.startsWith("mood:") && !tag.startsWith("format:"))
      .slice(0, TAGS_ON_TILE);
  return (
    <div class="tags">
      <For each={tags()}>{(tag) => <Tag tag={tag} />}</For>
    </div>
  );
}

function VideoPreview(props: { item: Item }) {
  const matcher = createMemo(() => chapterMatcher(route().q));
  return (
    <>
      <img class="tile-thumb" src={`https://i.ytimg.com/vi/${props.item.id}/hqdefault.jpg`} loading="lazy" alt="" />
      <Show when={props.item.chapters}>
        <VideoMap item={props.item} matches={(chapter) => matcher()(chapter.tags)} />
      </Show>
    </>
  );
}

/** The first paragraph of our breakdown, as plain text. */
function summary(item: Item): string {
  const html = localized(item, lang()).html;
  const first = html.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? html;
  const div = document.createElement("div");
  div.innerHTML = first;
  return div.textContent ?? "";
}

function open(entry: Entry) {
  return {
    tabindex: "0",
    onClick: () => openEntry(entry.latest.id),
    onKeyDown: (event: KeyboardEvent) => event.key === "Enter" && openEntry(entry.latest.id),
  };
}

function Tile(props: { entry: Entry }) {
  const item = () => props.entry.latest;
  return (
    <article class={{ tile: true, video: item().kind === "video" }} data-weight={weightOf(props.entry)} {...open(props.entry)}>
      <EntryMeta item={item()} />
      <Title entry={props.entry} />
      <Show when={item().kind === "video"} fallback={<XCompact item={item()} />}>
        <VideoPreview item={item()} />
      </Show>
      <Show when={props.entry.items.length > 1}>
        <p class="tile-thread">{t().tile.more(props.entry.items.length - 1)}</p>
      </Show>
      <TileTags entry={props.entry} />
    </article>
  );
}

export function Tiles(props: { entries: Entry[] }) {
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

/** A list row: what it means on the left, what he actually posted on the right. */
function Row(props: { entry: Entry }) {
  const item = () => props.entry.latest;
  return (
    <article class="row" data-weight={weightOf(props.entry)} {...open(props.entry)}>
      <div class="row-main">
        <EntryMeta item={item()} />
        <Title entry={props.entry} />
        <p class="row-summary">{summary(item())}</p>
        <Show when={props.entry.items.length > 1}>
          <p class="tile-thread">{t().tile.more(props.entry.items.length - 1)}</p>
        </Show>
        <TileTags entry={props.entry} />
      </div>
      <div class="row-post">
        <Show when={item().kind === "video"} fallback={<XCompact item={item()} lines={5} />}>
          <VideoPreview item={item()} />
        </Show>
      </div>
    </article>
  );
}

export function List(props: { entries: Entry[] }) {
  return (
    <div class="rows">
      <For each={props.entries}>{(entry) => <Row entry={entry} />}</For>
    </div>
  );
}
