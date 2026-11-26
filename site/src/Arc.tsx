import { createMemo, For, Show } from "solid-js";
import { itemById, localized, type Item } from "./content";
import { formatDate, lang, t } from "./i18n";
import { scrollBehavior } from "./motion";
import { postHref, route } from "./route";
import { sectionMatcher } from "./search";
import { describe, sortTags, Tag } from "./Tag";
import type { ArcSectionText, Described, ForeignPost } from "./types";
import { XEmbed } from "./XPost";

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const EMBED_RE = /(?:<p>\s*)?<!--\s*(post|frame):([a-zA-Z0-9_-]+)\s*-->(?:\s*<\/p>)?/g;

function foreignText(post: ForeignPost | "unavailable" | undefined): string {
  return post && post !== "unavailable" ? `${post.author} ${post.name ?? ""} ${post.text ?? ""}` : "";
}

function describedText(value: Described | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : Object.values(value).join(" ");
}

/** Section titles and HTML in the current language, falling back to English. */
function sectionTexts(item: Item): { list: ArcSectionText[]; fallback: boolean } {
  if (lang() === "en") return { list: item.sectionText ?? [], fallback: false };
  const translated = item.translations[lang()]?.sections;
  if (translated && translated.length === item.sections?.length) return { list: translated, fallback: false };
  return { list: item.sectionText ?? [], fallback: true };
}

/** Combined EN + RU text of one section plus any X/frame embeds inside it. */
function sectionSearchText(item: Item, index: number): string {
  const en = item.sectionText?.[index];
  const parts: string[] = en ? [en.title, stripHtml(en.html)] : [];
  const rawHtml = en?.html ?? "";
  for (const match of rawHtml.matchAll(EMBED_RE)) {
    const [, kind, id] = match;
    if (kind === "post") {
      const embed = item.embeds?.[id];
      if (embed) parts.push(embed.text, foreignText(embed.parent), foreignText(embed.quoted));
    } else if (kind === "frame") {
      const frame = item.frames?.[id];
      if (frame) parts.push(frame.videoTitle, describedText(frame.caption));
    }
  }
  for (const tr of Object.values(item.translations)) {
    const sec = tr.sections?.[index];
    if (sec) parts.push(sec.title, stripHtml(sec.html));
  }
  return parts.join(" ");
}

export function formatArcPeriod(item: Item): string {
  if (!item.from || !item.to) return "";
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const from = formatDate(new Date(`${item.from}T12:00:00`), opts);
  const to = formatDate(new Date(`${item.to}T12:00:00`), { ...opts, year: "numeric" });
  return `${from} – ${to}`;
}

/** Editorial card cover for an arc in the feed (Tiles & List). */
export function ArcPreview(props: { item: Item }) {
  return (
    <div class="arc-preview">
      <Show when={props.item.cover}>
        {(src) => <img class="arc-cover" src={src()} loading="lazy" alt="" />}
      </Show>
      <Show when={props.item.sourcesCount}>
        {(count) => (
          <div class="arc-preview-badge">
            <span>{t().arc.sources(count())}</span>
          </div>
        )}
      </Show>
    </div>
  );
}

type Piece =
  | { type: "html"; html: string }
  | { type: "post"; id: string }
  | { type: "frame"; id: string };

function splitEmbeds(html: string): Piece[] {
  const pieces: Piece[] = [];
  let cursor = 0;
  for (const match of html.matchAll(EMBED_RE)) {
    const start = match.index ?? 0;
    const before = html.slice(cursor, start).trim();
    if (before) pieces.push({ type: "html", html: before });
    pieces.push({ type: match[1] as "post" | "frame", id: match[2] });
    cursor = start + match[0].length;
  }
  const tail = html.slice(cursor).trim();
  if (tail) pieces.push({ type: "html", html: tail });
  return pieces;
}

/** Preserve the active `?q=` and add a tooltip on inline links to internal posts on this site. */
function withActiveQuery(html: string): string {
  const hint = escapeAttr(t().arc.internalHint);
  return html.replace(/<a href="#\/post\/([\w-]+)" class="internal-post"/g, (_, id: string) => {
    return `<a href="${escapeAttr(postHref(id))}" class="internal-post" title="${hint}"`;
  });
}

/** Full magazine-style view of an editorial arc with per-section tags, inline X cards and video frames. */
export function ArcBody(props: { item: Item }) {
  const matcher = createMemo(() => sectionMatcher(route().q));
  const resolved = createMemo(() => sectionTexts(props.item));
  const texts = () => resolved().list;
  const matches = (index: number) =>
    !props.item.sections![index].collapsible &&
    matcher()(props.item.sections![index].tags, sectionSearchText(props.item, index));

  const matchedSections = createMemo(() =>
    (props.item.sections ?? [])
      .map((section, index) => ({ section, index }))
      .filter(({ index }) => matches(index)),
  );

  const jumpTo = (id: string) => {
    const el = document.getElementById(`arc-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    el.focus({ preventScroll: true });
  };

  return (
    <div class="arc-body">
      <div class="arc-meta-strip">
        <Show when={props.item.sourcesCount}>
          {(count) => <span>{t().arc.sources(count())}</span>}
        </Show>
        <Show when={props.item.council}>
          {(who) => <span>{t().arc.writtenBy(who())}</span>}
        </Show>
      </div>

      <Show when={matchedSections().length > 0}>
        <div class="arc-matched-bar">
          <span class="arc-matched-label">{t().arc.matched}:</span>
          <For each={matchedSections()}>
            {({ section, index }) => (
              <button type="button" class="arc-jump" onClick={() => jumpTo(section.id)}>
                {texts()[index]?.title ?? section.id}
              </button>
            )}
          </For>
        </div>
      </Show>

      <Show when={localized(props.item, lang()).fallback || resolved().fallback}>
        <p class="muted small">{t().noTranslation}</p>
      </Show>

      <Show when={localized(props.item, lang()).html.trim()}>
        <div class="analysis" innerHTML={withActiveQuery(localized(props.item, lang()).html)} />
      </Show>

      <For each={props.item.sections ?? []}>
        {(section, index) => {
          const text = () => texts()[index()];
          return (
            <Show
              when={!section.collapsible}
              fallback={
                <details class="arc-sources" id={`arc-${section.id}`}>
                  <summary>{t().arc.viewSources(props.item.sourcesCount ?? 0)}</summary>
                  <div class="analysis" innerHTML={text()?.html ?? ""} />
                </details>
              }
            >
              <section
                class={{ "arc-section": true, match: matches(index()) }}
                id={`arc-${section.id}`}
                tabindex="-1"
              >
                <header class="arc-section-head">
                  <h2>{text()?.title}</h2>
                  <Show when={section.ownTags.length > 0}>
                    <div class="tags arc-section-tags">
                      <For each={sortTags(section.ownTags)}>{(tag) => <Tag tag={tag} />}</For>
                    </div>
                  </Show>
                </header>
                <For each={splitEmbeds(text()?.html ?? "")}>
                  {(piece) =>
                    piece.type === "html" ? (
                      <div class="analysis" innerHTML={withActiveQuery(piece.html)} />
                    ) : piece.type === "post" ? (
                      <Show when={props.item.embeds?.[piece.id]}>
                        {(embed) => (
                          <div class="arc-embed">
                            <XEmbed post={embed()} />
                            <Show when={itemById(piece.id)}>
                              <a class="arc-embed-link" href={postHref(piece.id)}>
                                {t().arc.viewPost} →
                              </a>
                            </Show>
                          </div>
                        )}
                      </Show>
                    ) : (
                      <Show when={props.item.frames?.[piece.id]}>
                        {(frame) => (
                          <figure class="arc-frame">
                            <a class="arc-frame-media" href={frame().videoUrl} target="_blank" rel="noreferrer">
                              <img
                                src={frame().src}
                                loading="lazy"
                                alt={describe(frame().caption) ?? frame().videoTitle}
                              />
                              <span class="arc-frame-time">{t().openAt(frame().time)} ↗</span>
                            </a>
                            <figcaption>
                              <strong>{frame().videoTitle}</strong> — {describe(frame().caption)}
                            </figcaption>
                          </figure>
                        )}
                      </Show>
                    )
                  }
                </For>
              </section>
            </Show>
          );
        }}
      </For>
    </div>
  );
}
