import { createMemo, createSignal, For, Match, onSettled, Show, Switch } from "solid-js";
import {
  answersFeed,
  entries,
  entryMetric,
  items,
  localized,
  previous,
  type Entry,
  type ForeignPost,
  type Item,
  type Kind,
  type Metrics,
} from "./content";
import { formatCount, formatDate, lang, LANGS, setLang, t } from "./i18n";
import Ribbon from "./Ribbon";
import { closeEntry, feedHref, route } from "./route";
import { search, sortOf } from "./search";
import SearchBox from "./SearchBox";
import StatsPage from "./StatsPage";
import { sortTags, Tag } from "./Tag";
import TagCloud from "./TagCloud";
import TagMenu from "./TagMenu";
import TagsPage from "./TagsPage";
import Tiles from "./Tiles";
import { Chapters, VideoCard } from "./Video";
import Counts from "./Counts";
import loopWebm from "../../assets/header/loop-grok-1440.webm?url";
import loopMp4 from "../../assets/header/loop-grok-1440.mp4?url";
import loopWebmMobile from "../../assets/header/loop-grok-960.webm?url";
import loopMp4Mobile from "../../assets/header/loop-grok-960.mp4?url";
import posterWebp from "../../assets/header/poster-1440.webp?url";
import posterJpg from "../../assets/header/poster-1440.jpg?url";
import posterWebpMobile from "../../assets/header/poster-960.webp?url";
import posterJpgMobile from "../../assets/header/poster-960.jpg?url";
import avatar from "../../assets/theo-avatar.png?url";

/** Same breakpoint as the mobile header in styles.css. */
const MOBILE = "(max-width: 600px)";


const DAY_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", weekday: "long" };
const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
const IS_URL = /^https?:\/\//;

function RichText(props: { text: string }) {
  return (
    <p class="post-text">
      <For each={props.text.split(URL_PATTERN)}>
        {(part) =>
          IS_URL.test(part) ? (
            <a href={part} target="_blank" rel="noreferrer">
              {part}
            </a>
          ) : (
            part
          )
        }
      </For>
    </p>
  );
}

function Media(props: { urls: string[] }) {
  return (
    <Show when={props.urls.length > 0}>
      <div class="media" data-count={props.urls.length}>
        <For each={props.urls}>
          {(url) => (
            <a href={url} target="_blank" rel="noreferrer">
              <img src={url} loading="lazy" alt="" />
            </a>
          )}
        </For>
      </div>
    </Show>
  );
}

/** X has no avatars without login, so other people get their initial. */
function Initial(props: { post: ForeignPost }) {
  return <span class="avatar initial">{(props.post.name ?? props.post.author).replace(/^@/, "").slice(0, 1)}</span>;
}

function Author(props: { post: ForeignPost }) {
  return (
    <a class="author" href={props.post.url} target="_blank" rel="noreferrer">
      <strong>{props.post.name ?? props.post.author}</strong> <span class="muted">{props.post.author}</span>
    </a>
  );
}

/** Someone else's post nested in Theo's: what he quotes. */
function Quoted(props: { post: ForeignPost | "unavailable" }) {
  return (
    <div class="quoted">
      <Show when={props.post !== "unavailable" && props.post} fallback={<p class="muted">{t().postFailed}</p>}>
        {(post) => (
          <>
            <Author post={post()} />
            <Show when={post().text}>{(text) => <RichText text={text()} />}</Show>
            <Media urls={post().media ?? []} />
          </>
        )}
      </Show>
    </div>
  );
}

/** The post Theo answered at the top of the conversation. */
function ParentStep(props: { post: ForeignPost | "unavailable" }) {
  return (
    <Show
      when={props.post !== "unavailable" && props.post}
      fallback={
        <div class="step">
          <span class="avatar initial">?</span>
          <p class="muted">{t().parentFailed}</p>
        </div>
      }
    >
      {(post) => (
        <div class="step">
          <Initial post={post()} />
          <div class="step-body">
            <Author post={post()} />
            <Show when={post().text}>{(text) => <RichText text={text()} />}</Show>
            <Media urls={post().media ?? []} />
          </div>
        </div>
      )}
    </Show>
  );
}

function When(props: { item: Item; withDate: boolean }) {
  return (
    <a class="when" href={props.item.url} target="_blank" rel="noreferrer" title={t().openOnX}>
      <Show when={props.item.kind !== "repost"}>{t().kind[props.item.kind]} · </Show>
      {formatDate(props.item.createdAt, props.withDate ? DATE_TIME_FORMAT : TIME_FORMAT)} ↗
    </a>
  );
}

/** Theo's tone in this one post, next to its time. */
function Mood(props: { item: Item }) {
  return <For each={props.item.ownTags.filter((tag) => tag.startsWith("mood:"))}>{(tag) => <Tag tag={tag} />}</For>;
}

function TheoStep(props: { item: Item; prev?: Item; withDate: boolean }) {
  const quotesPrev = () => props.prev !== undefined && previous(props.item) === props.prev && !!props.item.quoted;
  return (
    <Show
      when={props.item.kind === "repost" && props.item.quoted !== "unavailable" && props.item.quoted}
      fallback={
        <div class="step">
          <img class="avatar" src={avatar} alt="" />
          <div class="step-body">
            <div>
              <strong>Theo - t3.gg</strong> <span class="muted">@theo</span> <When item={props.item} withDate={props.withDate} />{" "}
              <Mood item={props.item} />
            </div>
            <Show when={props.item.text}>{(text) => <RichText text={text()} />}</Show>
            <Media urls={props.item.media} />
            <Show when={props.item.quoted}>
              {(quoted) => (
                <Show when={!quotesPrev()} fallback={<p class="muted small">{t().quotesAbove}</p>}>
                  <Quoted post={quoted()} />
                </Show>
              )}
            </Show>
            <Counts metrics={props.item.metrics} />
          </div>
        </div>
      }
    >
      {(original) => (
        <div class="step">
          <Initial post={original()} />
          <div class="step-body">
            <div class="reposted muted small">
              <img class="avatar tiny" src={avatar} alt="" /> {t().reposted} · <When item={props.item} withDate={props.withDate} />{" "}
              <Mood item={props.item} />
            </div>
            <Author post={original()} />
            <Show when={original().text}>{(text) => <RichText text={text()} />}</Show>
            <Media urls={original().media ?? []} />
            <Counts metrics={props.item.metrics} />
          </div>
        </div>
      )}
    </Show>
  );
}

/** Theo's posts as one X-style conversation, starting from the post he answered. */
function Conversation(props: { entry: Entry }) {
  const spansDays = () => props.entry.items.some((item) => item.day !== props.entry.day);
  return (
    <div class="post">
      <For each={props.entry.items}>
        {(item, index) => (
          <>
            <Show when={!answersFeed(item) && item.parent}>{(parent) => <ParentStep post={parent()} />}</Show>
            <TheoStep item={item} prev={props.entry.items[index() - 1]} withDate={spansDays()} />
          </>
        )}
      </For>
    </div>
  );
}

function Analysis(props: { item: Item }) {
  const text = () => localized(props.item, lang());
  return (
    <>
      <Show when={text().fallback}>
        <p class="muted small">{t().noTranslation}</p>
      </Show>
      <div innerHTML={text().html} />
    </>
  );
}

function Analyses(props: { entry: Entry }) {
  return (
    <Show
      when={props.entry.items.length > 1}
      fallback={
        <Show
          when={props.entry.latest.kind === "video"}
          fallback={
            <div class="analysis">
              <Analysis item={props.entry.latest} />
            </div>
          }
        >
          <details class="analysis">
            <summary>{t().videoAnalysis}</summary>
            <Analysis item={props.entry.latest} />
          </details>
        </Show>
      }
    >
      <For each={props.entry.items}>
        {(item, index) => (
          <details class="analysis" open={index() === props.entry.items.length - 1}>
            <summary>
              {index() + 1}. {localized(item, lang()).title}
            </summary>
            <Analysis item={item} />
          </details>
        )}
      </For>
    </Show>
  );
}

function EntryCard(props: { entry: Entry }) {
  const weight = () => Math.max(...props.entry.items.map((item) => item.weight));
  // mood belongs to a single post, so it sits by each post instead of in the shared row
  const tags = () =>
    sortTags([...new Set(props.entry.items.flatMap((item) => item.ownTags))]).filter(
      (tag) => props.entry.latest.kind === "video" || !tag.startsWith("mood:"),
    );
  const latest = () => props.entry.latest;
  return (
    <article class="entry" data-weight={weight()}>
      <h3>
        <Show when={weight() >= 3}>
          <span class="star" title={t().main}>★</span>
        </Show>
        {localized(latest(), lang()).title}
      </h3>
      <Show when={latest().kind === "video"} fallback={<Conversation entry={props.entry} />}>
        <VideoCard item={latest()}>
          <Counts metrics={latest().metrics} />
        </VideoCard>
      </Show>
      <Show when={latest().chapters} fallback={<Analyses entry={props.entry} />}>
        <Chapters item={latest()} />
      </Show>
      <Show when={tags().length > 0}>
        <div class="tags">
          <For each={tags()}>{(tag) => <Tag tag={tag} />}</For>
        </div>
      </Show>
    </article>
  );
}

const hasMetrics = items.some((item) => item.metrics);

/** The whole entry (thread, analysis, video chapters) over the tiles, from `open=<id>`. */
function Overlay() {
  const entry = createMemo(() => {
    const id = route().open;
    return id ? entries.find((each) => each.items.some((item) => item.id === id)) : undefined;
  });
  onSettled(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && route().open && closeEntry();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <Show when={entry()}>
      {(open) => (
        <div class="overlay" onClick={(event) => event.target === event.currentTarget && closeEntry()}>
          <div class="overlay-panel" role="dialog" aria-modal="true">
            <button class="overlay-close" aria-label={t().close} onClick={() => closeEntry()}>
              ×
            </button>
            <EntryCard entry={open()} />
          </div>
        </div>
      )}
    </Show>
  );
}

function Feed() {
  const q = () => route().q;

  // minor posts (weight 1) only show up when the query asks for weights
  const found = createMemo(() =>
    search(q()).filter((entry) => /weight:/.test(q()) || entry.items.some((item) => item.weight >= 2)),
  );
  const visible = createMemo(() => {
    const key = sortOf(q());
    return key === "new" ? found() : [...found()].sort((a, b) => entryMetric(b, key) - entryMetric(a, key));
  });

  return (
    <>
      <Show when={q()} fallback={<div class="tiles-start" />}>
        <p class="results muted small">
          {t().found(visible().length)} · <a href={feedHref("")}>{t().reset}</a>
        </p>
      </Show>
      <Show when={visible().length > 0} fallback={<p class="muted nothing">{t().nothing}</p>}>
        <Tiles entries={visible()} />
      </Show>
    </>
  );
}

export default function App() {
  let bar: HTMLDivElement | undefined;
  const [stuck, setStuck] = createSignal(false);
  // the search is part of the page until it sticks to the top; then it gets a solid bar
  onSettled(() => {
    const check = () => {
      setStuck(!!bar && window.scrollY > 0 && bar.getBoundingClientRect().top <= 0);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  });

  return (
    <>
      <Ribbon />

      <nav class="topnav">
        <a href={feedHref("")} class={{ current: route().page === "feed" }}>
          {t().nav.feed}
        </a>
        <a href="#/tags" class={{ current: route().page === "tags" }}>
          {t().nav.tags}
        </a>
        <a href="#/stats" class={{ current: route().page === "stats" }}>
          {t().nav.stats}
        </a>
        <span class="langs">
          <For each={LANGS}>
            {(code) => (
              <button class={{ current: lang() === code }} onClick={() => setLang(code)}>
                {code.toUpperCase()}
              </button>
            )}
          </For>
        </span>
      </nav>

      <header class="hero">
        {/* First frame of the loop, shown until the video has a frame of its own. */}
        <picture>
          <source media={MOBILE} srcset={posterWebpMobile} type="image/webp" />
          <source media={MOBILE} srcset={posterJpgMobile} />
          <source srcset={posterWebp} type="image/webp" />
          <img class="hero-media" src={posterJpg} alt="" fetchpriority="high" />
        </picture>
        <video class="hero-media" autoplay muted loop playsinline>
          <source media={MOBILE} src={loopWebmMobile} type="video/webm" />
          <source media={MOBILE} src={loopMp4Mobile} type="video/mp4" />
          <source src={loopWebm} type="video/webm" />
          <source src={loopMp4} type="video/mp4" />
        </video>
        <div class="hero-text">
          <h1>T3 Thoughts</h1>
          <p>{t().tagline}</p>
        </div>
      </header>

      <main>
        <div class={{ bar: true, stuck: stuck() }} ref={(el) => (bar = el)}>
          <SearchBox stuck={stuck()} />
        </div>
        <Show when={route().page === "feed"}>
          <div class="hero-cloud">
            <TagCloud short />
          </div>
        </Show>

        <Switch>
          <Match when={route().page === "tags"}>
            <TagsPage />
          </Match>
          <Match when={route().page === "stats"}>
            <StatsPage />
          </Match>
          <Match when={route().page === "feed"}>
            <Feed />
          </Match>
        </Switch>
      </main>

      <footer>{t().footer}</footer>
      <Overlay />
      <TagMenu />
    </>
  );
}
