import { createMemo, createSignal, For, Match, onSettled, Show, Switch } from "solid-js";
import { entries, entryMetric, localized, type Entry, type Item } from "./content";
import { lang, LANGS, setLang, t, type Lang } from "./i18n";
import { Icon } from "./icons";
import { setView, view, VIEWS } from "./prefs";
import Ribbon from "./Ribbon";
import { feedHref, route } from "./route";
import { search, sortOf } from "./search";
import SearchBox from "./SearchBox";
import StatsPage from "./StatsPage";
import { sortTags, Tag } from "./Tag";
import TagCloud from "./TagCloud";
import TagMenu from "./TagMenu";
import TagsPage from "./TagsPage";
import { EntryMeta, List, Tiles } from "./Tiles";
import { Chapters, VideoCard } from "./Video";
import { XThread } from "./XPost";
import Counts from "./Counts";
import loopWebm from "../../assets/header/loop-grok-1280.webm?url";
import loopMp4 from "../../assets/header/loop-grok-1280.mp4?url";
import loopWebmMobile from "../../assets/header/loop-grok-960.webm?url";
import loopMp4Mobile from "../../assets/header/loop-grok-960.mp4?url";
import posterWebp from "../../assets/header/poster-1280.webp?url";
import posterJpg from "../../assets/header/poster-1280.jpg?url";
import posterWebpMobile from "../../assets/header/poster-960.webp?url";
import posterJpgMobile from "../../assets/header/poster-960.jpg?url";

/** Same breakpoint as the phone header in styles.css. */
const MOBILE = "(max-width: 700px)";

const LANG_NAMES: Record<Lang, string> = { en: "English", ru: "Русский" };

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
        <div class="analysis">
          <Analysis item={props.entry.latest} />
        </div>
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

const topical = (entry: Entry) =>
  new Set(entry.items.flatMap((item) => item.ownTags).filter((tag) => !/^(mood|format):/.test(tag)));

/** Other entries that share the most tags with this one. */
function relatedEntries(entry: Entry, limit = 3): Entry[] {
  const mine = topical(entry);
  return entries
    .filter((other) => other !== entry)
    .map((other) => ({ other, shared: [...topical(other)].filter((tag) => mine.has(tag)).length }))
    .filter(({ shared }) => shared > 0)
    .sort((a, b) => b.shared - a.shared || b.other.latest.createdAt.getTime() - a.other.latest.createdAt.getTime())
    .slice(0, limit)
    .map(({ other }) => other);
}

/** One entry on a page of its own: the posts as on X, our breakdown, its tags, then what is related. */
function PostPage() {
  const entry = createMemo(() => entries.find((each) => each.items.some((item) => item.id === route().id)));
  return (
    <Show
      when={entry()}
      fallback={
        <section class="page">
          <p class="muted">{t().notFound}</p>
          <a href={feedHref(route().q)}>{t().backToFeed}</a>
        </section>
      }
    >
      {(open) => {
        const latest = () => open().latest;
        const weight = () => Math.max(...open().items.map((item) => item.weight));
        const tags = () =>
          sortTags([...new Set(open().items.flatMap((item) => item.ownTags))]).filter(
            (tag) => latest().kind === "video" || !tag.startsWith("mood:"),
          );
        return (
          <>
            <article class="page post-page" data-weight={weight()}>
              <a class="back" href={feedHref(route().q)}>
                <Icon name="back" />
                {t().backToFeed}
              </a>
              <EntryMeta item={latest()} />
              <h1 class="post-title">
                <Show when={weight() >= 3}>
                  <span class="star" title={t().main}>★</span>
                </Show>
                {localized(latest(), lang()).title}
              </h1>
              <Show when={latest().kind === "video"} fallback={<XThread entry={open()} />}>
                <VideoCard item={latest()}>
                  <Counts metrics={latest().metrics} />
                </VideoCard>
              </Show>
              <h2 class="section-label">{t().breakdown}</h2>
              <Show when={latest().chapters} fallback={<Analyses entry={open()} />}>
                <Chapters item={latest()} />
              </Show>
              <Show when={tags().length > 0}>
                <div class="tags">
                  <For each={tags()}>{(tag) => <Tag tag={tag} />}</For>
                </div>
              </Show>
            </article>
            <Show when={relatedEntries(open()).length > 0}>
              <section class="related">
                <h2 class="section-label">{t().related}</h2>
                <List entries={relatedEntries(open())} />
              </section>
            </Show>
          </>
        );
      }}
    </Show>
  );
}

function ViewSwitch() {
  return (
    <div class="segmented" role="radiogroup" aria-label={t().views.label}>
      <For each={VIEWS}>
        {(mode) => (
          <button
            role="radio"
            aria-checked={view() === mode ? "true" : "false"}
            class={{ current: view() === mode }}
            title={t().views[mode]}
            onClick={() => setView(mode)}
          >
            <Icon name={mode} />
            <span>{t().views[mode]}</span>
          </button>
        )}
      </For>
    </div>
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
      <div class="results">
        <p class="results-count">{q() ? t().found(visible().length) : t().total(visible().length)}</p>
        <ViewSwitch />
      </div>
      <Show when={visible().length > 0} fallback={<p class="muted nothing">{t().nothing}</p>}>
        <Show when={view() === "list"} fallback={<Tiles entries={visible()} />}>
          <List entries={visible()} />
        </Show>
      </Show>
    </>
  );
}

/** EN ▾ that opens a short list of languages. */
function LangMenu() {
  const [open, setOpen] = createSignal(false);
  let box: HTMLDivElement | undefined;
  let button: HTMLButtonElement | undefined;
  // arrows move between languages, Escape closes and gives focus back to the button
  const onListKey = (event: KeyboardEvent) => {
    const options = [...(box?.querySelectorAll<HTMLButtonElement>(".lang-list button") ?? [])];
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      options[(index + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length]?.focus();
    } else if (event.key === "Escape") {
      setOpen(false);
      button?.focus();
    }
  };
  onSettled(() => {
    const close = (event: Event) => !box?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  });
  return (
    <div class="lang" ref={(el) => (box = el)}>
      <button class="lang-button" ref={(el) => (button = el)} aria-haspopup="listbox" aria-expanded={open() ? "true" : "false"} onClick={() => setOpen(!open())}>
        {lang().toUpperCase()}
        <Icon name="chevron" />
      </button>
      <Show when={open()}>
        <ul class="lang-list" role="listbox" onKeyDown={onListKey}>
          <For each={LANGS}>
            {(code) => (
              <li role="option" aria-selected={lang() === code ? "true" : "false"}>
                <button
                  class={{ current: lang() === code }}
                  ref={(el) => lang() === code && queueMicrotask(() => el.focus())}
                  onClick={() => {
                    setLang(code);
                    setOpen(false);
                    button?.focus();
                  }}
                >
                  <span class="lang-code">{code.toUpperCase()}</span>
                  {LANG_NAMES[code]}
                  <Show when={lang() === code}>
                    <Icon name="check" />
                  </Show>
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}

function TopNav() {
  const feed = () => route().page === "feed";
  return (
    <header class={{ topnav: true, solid: !feed() }}>
      <Show when={!feed()}>
        <a class="brand" href={feedHref(route().q)}>
          T3 Thoughts
        </a>
      </Show>
      <nav class="nav-links">
        <a href={feedHref(route().q)} class={{ current: feed() || route().page === "post" }}>
          {t().nav.feed}
        </a>
        <a href="#/tags" class={{ current: route().page === "tags" }}>
          {t().nav.tags}
        </a>
        <a href="#/stats" class={{ current: route().page === "stats" }}>
          {t().nav.stats}
        </a>
      </nav>
      <LangMenu />
      {/* without the video there is nothing for the search to sit on, so it joins the header */}
      <Show when={!feed()}>
        <div class="head-search">
          <SearchBox stuck />
        </div>
      </Show>
    </header>
  );
}

/**
 * The video in a frame of fixed proportions: the title is placed and sized in the frame's
 * own units, so it keeps its place beside Theo at any window width.
 */
function Hero() {
  return (
    <div class="hero">
      <div class="hero-frame">
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
      </div>
    </div>
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
      <TopNav />
      <Show when={route().page === "feed"}>
        <Hero />
      </Show>

      <main class={{ "on-hero": route().page === "feed" }}>
        <Show when={route().page === "feed"}>
          <div class={{ bar: true, stuck: stuck() }} ref={(el) => (bar = el)}>
            <SearchBox stuck={stuck()} />
          </div>
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
          <Match when={route().page === "post"}>
            <PostPage />
          </Match>
          <Match when={route().page === "feed"}>
            <Feed />
          </Match>
        </Switch>
      </main>

      <footer>{t().footer}</footer>
      <TagMenu />
    </>
  );
}
