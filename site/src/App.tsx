import { createEffect, createMemo, createSignal, For, Match, onSettled, Show, Switch } from "solid-js";
import { insert } from "@solidjs/web";
import { entries, entryMetric, localized, type Entry, type Item } from "./content";
import { lang, LANGS, setLang, t, type Lang } from "./i18n";
import { Icon } from "./icons";
import { setView, view, VIEWS } from "./prefs";
import { radioKeys, radioTab } from "./radios";
import Ribbon from "./Ribbon";
import { scrollBehavior } from "./motion";
import { feedHref, route, setQuery, withQuery } from "./route";
import { toTheVideo } from "./scroll";
import { search, sortOf } from "./search";
import SearchBox, { moveSearch } from "./SearchBox";
import StatsPage from "./StatsPage";
import { sortTags, Tag } from "./Tag";
import TagMenu from "./TagMenu";
import TagsPage from "./TagsPage";
import { EntryMeta, List, Tiles } from "./Tiles";
import { Chapters, VideoCard } from "./Video";
import { XThread } from "./XPost";
import Counts from "./Counts";
import Hero from "./Hero";
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
    <div class="segmented" role="radiogroup" aria-label={t().views.label} onKeyDown={radioKeys}>
      <For each={VIEWS}>
        {(mode) => (
          <button
            role="radio"
            aria-checked={view() === mode ? "true" : "false"}
            tabindex={radioTab(view() === mode)}
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
    <div class="feed">
      <div class="results">
        <p class="results-count" role="status">{!visible().length ? t().nothing : q() ? t().found(visible().length) : t().total(visible().length)}</p>
        {/* nothing found: nothing to lay out either */}
        <Show when={visible().length > 0}>
          <ViewSwitch />
        </Show>
      </div>
      <Show when={visible().length > 0} fallback={<button class="nothing" onClick={() => setQuery("")}>{t().clear}</button>}>
        <Show when={view() === "list"} fallback={<Tiles entries={visible()} />}>
          <List entries={visible()} />
        </Show>
      </Show>
    </div>
  );
}

/** EN ▾ that opens a short list of languages. */
function LangMenu() {
  const [open, setOpen] = createSignal(false);
  // the list opens from the button's left edge, or from its right one when it would not fit that way
  // (the button at the right of a narrow header)
  const [fromRight, setFromRight] = createSignal(false);
  let box: HTMLDivElement | undefined;
  let button: HTMLButtonElement | undefined;
  // arrows move between languages, Escape closes and gives focus back to the button
  const onListKey = (event: KeyboardEvent) => {
    if (!open()) return;
    const options = [...(box?.querySelectorAll<HTMLButtonElement>(".lang-list button") ?? [])];
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? index + 1 : Math.max(index, 0) - 1;
      options.at(next % options.length)?.focus();
    } else if (event.key === "Escape") {
      setOpen(false);
      button?.focus();
    }
  };
  onSettled(() => {
    const close = (event: Event) => !box?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("click", close);
    // a press elsewhere closes it first (a card or a tag keeps its click to itself), and so does
    // a new page
    const shut = () => setOpen(false);
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("hashchange", shut);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("hashchange", shut);
      window.removeEventListener("keydown", onKey);
    };
  });
  return (
    <div
      class="lang"
      onKeyDown={onListKey}
      ref={(el) => (box = el)}
      // Tab out of the list closes it, as a click elsewhere does
      onFocusOut={(event) => !box?.contains(event.relatedTarget as Node | null) && event.relatedTarget && setOpen(false)}
    >
      <button class="lang-button" aria-label={`${t().language}: ${LANG_NAMES[lang()]}`} ref={(el) => (button = el)} aria-haspopup="menu" aria-expanded={open() ? "true" : "false"} onClick={() => {
        const edge = button?.getBoundingClientRect();
        setFromRight(!!edge && edge.left + 180 > document.documentElement.clientWidth - 8);
        setOpen(!open());
      }}>
        {lang().toUpperCase()}
        <Icon name="chevron" />
      </button>
      <Show when={open()}>
        <ul class={{ "lang-list": true, "from-right": fromRight() }} role="menu" aria-label={t().language}>
          <For each={LANGS}>
            {(code) => (
              <li role="none">
                <button
                  role="menuitemradio"
                  aria-checked={lang() === code ? "true" : "false"}
                  class={{ current: lang() === code }}
                  ref={(el) => queueMicrotask(() => lang() === code && el.focus())}
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

/** The site's name, the way up to the video: on the feed it scrolls there, elsewhere it opens the feed there. */
function Brand() {
  const up = () => (route().page === "feed" ? window.scrollTo({ top: 0, behavior: scrollBehavior() }) : toTheVideo());
  return (
    <a class="brand" href={feedHref(route().q)} onClick={up}>
      T3 Thoughts
    </a>
  );
}

function NavLinks() {
  return (
    <nav class="nav-links">
      <a href={feedHref(route().q)} class={{ current: route().page === "feed" || route().page === "post" }}>
        {t().nav.feed}
      </a>
      <a href={withQuery("/tags", route().q)} class={{ current: route().page === "tags" }}>
        {t().nav.tags}
      </a>
      <a href={withQuery("/stats", route().q)} class={{ current: route().page === "stats" }}>
        {t().nav.stats}
      </a>
    </nav>
  );
}

function TopNav(props: { slot: (el: HTMLElement) => void }) {
  const feed = () => route().page === "feed";
  let header: HTMLElement | undefined;
  // the header's real height for what sits under it (Tags: the index, the headings it scrolls to):
  // narrow, and longer in Russian, it takes two rows
  onSettled(() => {
    if (!header) return;
    const el = header;
    const observer = new ResizeObserver(() =>
      requestAnimationFrame(() => {
        // only a header that stays at the top (a phone's scrolls away with the page)
        const stays = el.classList.contains("solid") && ["sticky", "fixed"].includes(getComputedStyle(el).position);
        if (stays) {
          const height = `${el.getBoundingClientRect().height}px`;
          document.documentElement.style.setProperty("--head-height", height);
          // Reading mode needs this measurement before the feed's own header sticks.
          document.documentElement.style.setProperty("--stuck-height", height);
        } else document.documentElement.style.removeProperty("--head-height");
      }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  });
  return (
    <header class={{ topnav: true, solid: !feed() }} ref={(el) => (header = el)}>
      <Show when={!feed()}>
        <Brand />
      </Show>
      <NavLinks />
      <LangMenu />
      {/* without the video there is nothing for the search to sit on, so it joins the header;
          the place stays when the feed is open, empty and hidden, for the search to move in and out */}
      <div class="head-search" ref={props.slot} style={{ display: feed() ? "none" : undefined }} />
    </header>
  );
}

/**
 * One search box for every page, moved to where the page has it (the header, the feed's bar): a
 * tag picked on Tags opens the feed, and the search goes on there as it was, with the text, the
 * focus and a phone's editing screen, instead of a new box starting from nothing. Both places stay
 * on the page (hidden when not in use), so the box is never taken out with one: only moved, here.
 */
function oneSearch() {
  // a box of its own to move: JSX gives back what renders an element, not the element itself
  const search = document.createElement("div");
  search.className = "search-host";
  search.style.display = "contents";
  insert(search, () => <SearchBox />);
  return (slot: HTMLElement | undefined) => {
    if (!slot || search.parentElement === slot) return;
    const focused = search.contains(document.activeElement) ? (document.activeElement as HTMLElement) : undefined;
    // the move takes the focus away for a moment: not a blur to answer (the text stays, the screen too)
    moveSearch(() => {
      slot.append(search);
      focused?.focus({ preventScroll: true });
    });
  };
}

export default function App() {
  const place = oneSearch();
  let head: HTMLElement | undefined;
  let barSlot: HTMLElement | undefined;
  createEffect(
    () => route().page === "feed",
    (feed) => place(feed ? barSlot : head),
  );
  let bar: HTMLDivElement | undefined;
  const [stuck, setStuck] = createSignal(false);
  // the search is part of the page until it sticks to the top; then it gets a solid bar
  onSettled(() => {
    // until when a bar short of the top is looked at again, frame by frame
    let until = 0;
    const check = () => {
      // hidden (another page open), it is not on the page to stick
      const top = bar && bar.offsetHeight > 0 ? bar.getBoundingClientRect().top : Infinity;
      const on = window.scrollY > 0 && top <= 0;
      setStuck(on);
      // one jump of the scroll (Back to a place in the feed) gives one scroll event, and the bar
      // slides the last bit up to the top after it (the header above it eases): it is watched
      // until it gets there, for a moment
      // (and the feed coming back to a place deep in it: the bar is still hidden for a frame)
      if (!on && window.scrollY > 0 && (top < 60 || top === Infinity) && performance.now() < until) requestAnimationFrame(check);
    };
    const scrolled = () => {
      until = performance.now() + 600;
      check();
    };
    const observer = new ResizeObserver(([entry]) => {
      if (bar?.classList.contains("stuck") && entry.borderBoxSize[0].blockSize > 0) {
        document.documentElement.style.setProperty("--stuck-height", `${entry.borderBoxSize[0].blockSize}px`);
      }
    });
    if (bar) observer.observe(bar);
    check();
    window.addEventListener("scroll", scrolled, { passive: true });
    window.addEventListener("resize", scrolled);
    // another page: the feed may open already scrolled, with no scroll event to tell
    window.addEventListener("hashchange", scrolled);
    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", scrolled);
      window.removeEventListener("scroll", scrolled);
      window.removeEventListener("resize", scrolled);
    };
  });

  return (
    <>
      <Ribbon />
      <TopNav slot={(el) => (head = el)} />
      <Show when={route().page === "feed"}>
        <Hero />
      </Show>

      {/* stuck to the top, it is the same header as on the other pages, so the search keeps its place;
          on the page only with the feed, but kept there hidden, as the search's place (see oneSearch) */}
      <div class="bar-slot" style={{ display: route().page === "feed" ? undefined : "none" }}>
        <div class={{ bar: true, stuck: stuck() }} ref={(el) => (bar = el)}>
          <Show when={stuck()}>
            <Brand />
            <NavLinks />
            <LangMenu />
          </Show>
          <div class={{ "bar-search": true, "head-search": stuck() }} ref={(el) => (barSlot = el)} />
        </div>
      </div>

      <main>
        {/* no tags under the search: the posts come right after it, and the tags open with the
            search (its dropdown, a phone's editing screen) */}
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
