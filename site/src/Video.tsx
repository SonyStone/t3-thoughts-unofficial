import type { JSX } from "@solidjs/web";
import { createMemo, For, Show } from "solid-js";
import { localized, type Item } from "./content";
import { lang, t } from "./i18n";
import { route } from "./route";
import { chapterMatcher } from "./search";
import { sortTags, Tag } from "./Tag";
import type { Chapter, ChapterText } from "./types";

function clock(seconds: number): string {
  const whole = Math.floor(seconds);
  const [h, m, s] = [Math.floor(whole / 3600), Math.floor((whole % 3600) / 60), whole % 60];
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function at(item: Item, seconds: number): string {
  const url = item.url ?? "";
  return `${url}${url.includes("?") ? "&" : "?"}t=${Math.floor(seconds)}s`;
}

/** Chapter titles and text in the current language; a translation counts only if it has every chapter. */
function chapterTexts(item: Item): ChapterText[] {
  const translated = lang() === "en" ? undefined : item.translations[lang()]?.chapters;
  return translated && translated.length === item.chapters?.length ? translated : (item.chapterText ?? []);
}

export function VideoCard(props: { item: Item; children?: JSX.Element }) {
  return (
    <a class="video" href={props.item.url} target="_blank" rel="noreferrer">
      <img src={`https://i.ytimg.com/vi/${props.item.id}/hqdefault.jpg`} loading="lazy" alt="" />
      <div>
        <strong>{props.item.title}</strong>
        <Show when={props.item.duration}>
          <span class="muted"> · {props.item.duration}</span>
        </Show>
        <Show when={props.item.chapters?.length}>
          {(count) => <span class="muted"> · {t().chapters(count())}</span>}
        </Show>
        <div class="muted small">YouTube ↗</div>
        {props.children}
      </div>
    </a>
  );
}

/**
 * The whole video as one bar: a segment per chapter, as wide as it is long, brighter the
 * more it matters; sponsor reads are hatched. A click opens YouTube at that moment.
 */
export function VideoMap(props: { item: Item; matches: (chapter: Chapter) => boolean }) {
  const total = () => props.item.seconds ?? props.item.chapters!.at(-1)!.end;
  return (
    <div class="vmap" role="list">
      <For each={props.item.chapters}>
        {(chapter, index) => (
          <a
            role="listitem"
            class={{ segment: true, sponsor: !!chapter.sponsor, match: props.matches(chapter) }}
            data-weight={chapter.weight}
            style={{ "flex-grow": String(Math.max(chapter.end - chapter.start, 1) / total()) }}
            href={at(props.item, chapter.start)}
            target="_blank"
            rel="noreferrer"
            title={`${clock(chapter.start)} · ${chapterTexts(props.item)[index()]?.title ?? ""}`}
          />
        )}
      </For>
    </div>
  );
}

export function Chapters(props: { item: Item }) {
  const matcher = createMemo(() => chapterMatcher(route().q));
  const matches = (chapter: Chapter) => matcher()(chapter.tags);
  const sponsorOf = (chapter: Chapter) => props.item.sponsors?.find((sponsor) => sponsor.name === chapter.sponsor);
  return (
    <>
      <VideoMap item={props.item} matches={matches} />
      <Show when={props.item.preview}>
        <p class="muted small">{t().trial}</p>
      </Show>
      <div class="analysis" innerHTML={localized(props.item, lang()).html} />
      <ol class="chapters">
        <For each={props.item.chapters}>
          {(chapter, index) => (
            <li>
              <details class={{ chapter: true, match: matches(chapter), sponsor: !!chapter.sponsor }} open={matches(chapter)}>
                <summary>
                  <a class="chapter-time" href={at(props.item, chapter.start)} target="_blank" rel="noreferrer" title={t().openAt(clock(chapter.start))}>
                    {clock(chapter.start)}
                  </a>
                  <span class="chapter-title">
                    <Show when={chapter.weight >= 3}>
                      <span class="star" title={t().main}>★</span>
                    </Show>
                    {chapterTexts(props.item)[index()]?.title}
                  </span>
                  <Show when={sponsorOf(chapter)}>
                    {(sponsor) => (
                      <span class="sponsored">{sponsor().category === "selfpromo" ? t().selfpromo : t().sponsored}</span>
                    )}
                  </Show>
                </summary>
                <div class="tags">
                  <For each={sortTags(chapter.ownTags)}>{(tag) => <Tag tag={tag} />}</For>
                </div>
                <div class="analysis" innerHTML={chapterTexts(props.item)[index()]?.html ?? ""} />
                <Show when={sponsorOf(chapter)?.url}>
                  {(url) => (
                    <a class="sponsor-link" href={url()} target="_blank" rel="noreferrer sponsored">
                      {t().sponsorLink(sponsorOf(chapter)!.name)} ↗
                    </a>
                  )}
                </Show>
              </details>
            </li>
          )}
        </For>
      </ol>
    </>
  );
}
