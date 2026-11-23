import { createSignal, For, onCleanup, Show } from "solid-js";
import { hasCardSelection } from "./cardSelection";
import { answersFeed, previous, type Entry, type ForeignPost, type Item, type Metrics } from "./content";
import { formatCount, formatDate, formatTightCount, t } from "./i18n";
import { Icon, type IconName } from "./icons";
import avatar from "../../assets/theo-avatar.png?url";

/**
 * Posts drawn the way x.com draws them in its dark theme: same colors, type, spacing and
 * action bar, so a post reads as the original. Our own things (title, mood, tags) stay
 * outside this block.
 */

const SHORT_DATE: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
const FULL_DATE: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", month: "short", day: "numeric", year: "numeric" };
const VIDEO = /\.(mp4|webm|m3u8)(\?|$)/;
const TOKENS = /(https?:\/\/[^\s]+|@\w{1,15})/g;

const THEO: ForeignPost = { author: "@theo", name: "Theo - t3.gg", url: "https://x.com/theo" };

function XText(props: { text: string; class?: string }) {
  return (
    <div class={props.class ?? "x-text"}>
      <For each={props.text.split(TOKENS)}>
        {(part) =>
          /^https?:\/\//.test(part) ? (
            <a href={part} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
              {part.replace(/^https?:\/\/(www\.)?/, "").slice(0, 32)}
              {part.replace(/^https?:\/\/(www\.)?/, "").length > 32 ? "…" : ""}
            </a>
          ) : /^@\w/.test(part) ? (
            <a href={`https://x.com/${part.slice(1)}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
              {part}
            </a>
          ) : (
            part
          )
        }
      </For>
    </div>
  );
}

/**
 * X gives no avatars without login, so other people's come from unavatar.io by handle;
 * when it has none, the initial stands in.
 */
function XAvatar(props: { post: ForeignPost; small?: boolean }) {
  const [failed, setFailed] = createSignal(false);
  const handle = () => props.post.author.replace(/^@/, "");
  const src = () => (handle().toLowerCase() === "theo" ? avatar : `https://unavatar.io/x/${handle()}?fallback=false`);
  return (
    <Show
      when={!failed()}
      fallback={
        <span class={{ "x-avatar": true, initial: true, small: !!props.small }}>
          {(props.post.name ?? handle()).slice(0, 1)}
        </span>
      }
    >
      <img class={{ "x-avatar": true, small: !!props.small }} src={src()} loading="lazy" alt="" onError={() => setFailed(true)} />
    </Show>
  );
}

/** X's blue check; only Theo gets it here, since the data does not say who else has one. */
function Verified() {
  return (
    <svg class="x-verified" viewBox="0 0 22 22" role="img" aria-label={t().verified}>
      <path
        fill="currentColor"
        d="M20.4 11c0-1.4-.8-2.6-2-3.2.4-1.3.1-2.8-.9-3.8s-2.5-1.3-3.8-.9C13.1 1.9 11.9 1 10.5 1S7.9 1.9 7.3 3.1c-1.3-.4-2.8-.1-3.8.9s-1.3 2.5-.9 3.8C1.4 8.4.6 9.6.6 11s.8 2.6 2 3.2c-.4 1.3-.1 2.8.9 3.8s2.5 1.3 3.8.9c.6 1.2 1.8 2.1 3.2 2.1s2.6-.9 3.2-2.1c1.3.4 2.8.1 3.8-.9s1.3-2.5.9-3.8c1.2-.6 2-1.8 2-3.2z"
      />
      <path fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6.8 11.2l2.7 2.7 5.6-5.8" />
    </svg>
  );
}

function XHeader(props: { post: ForeignPost; at?: Date; href?: string }) {
  return (
    <div class="x-head">
      <a class="x-name" href={props.post.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
        {(props.post.name ?? props.post.author.replace(/^@/, "")).trim()}
        <Show when={props.post.author.toLowerCase() === "@theo"}>
          <Verified />
        </Show>
      </a>
      <span class="x-handle">{props.post.author}</span>
      <Show when={props.at}>
        {(at) => (
          <>
            <span class="x-dot">·</span>
            <a
              class="x-time"
              href={props.href}
              target="_blank"
              rel="noreferrer"
              title={formatDate(at(), FULL_DATE)}
              onClick={(event) => event.stopPropagation()}
            >
              {formatDate(at(), SHORT_DATE)}
            </a>
          </>
        )}
      </Show>
    </div>
  );
}

/**
 * Media as pictures: a click anywhere opens the post on x.com. A video shows its first
 * frame with X's play button and does not play here.
 */
function XMedia(props: { urls: string[] }) {
  return (
    <Show when={props.urls.length > 0}>
      <div class="x-media" data-count={Math.min(props.urls.length, 4)}>
        <For each={props.urls.slice(0, 4)}>
          {(url) =>
            VIDEO.test(url) ? (
              <div class="x-video">
                {/* #t=0.1 makes the browser show a frame instead of black */}
                <video src={`${url}#t=0.1`} muted playsinline preload="metadata" tabindex="-1" />
                <span class="x-play" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                  </svg>
                </span>
              </div>
            ) : (
              // X refuses images to pages from other sites unless the referrer is left out
              <img src={url} loading="lazy" referrerpolicy="no-referrer" alt="" />
            )
          }
        </For>
      </div>
    </Show>
  );
}

/** Opens a post on x.com, as a link would; links inside the post keep their own targets. */
function openOnX(url: string | undefined) {
  // a double or triple click selects words or the paragraph: the first click waits a moment to
  // see whether more follow (the browser still counts that as the click opening the tab)
  let wait: number | undefined;
  onCleanup(() => clearTimeout(wait));
  return {
    role: "link" as const,
    tabindex: "0",
    onClick: (event: MouseEvent) => {
      event.stopPropagation();
      clearTimeout(wait);
      const post = event.currentTarget as Element;
      if (!url || event.detail > 1 || (event.target as HTMLElement).closest("a, button")) return;
      wait = window.setTimeout(() => !hasCardSelection(post) && window.open(url, "_blank", "noopener"), 300);
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== "Enter" || !url || event.target !== event.currentTarget) return;
      event.stopPropagation();
      window.open(url, "_blank", "noopener");
    },
  };
}

const STATUS_ID = /\/status\/(\d+)/;

/** Each action opens X's own page for it, so a click does what the icon promises. */
const ACTIONS: [Extract<IconName, "reply" | "repost" | "like" | "views">, keyof Metrics | undefined, (id: string) => string][] = [
  ["reply", "replies", (id) => `https://x.com/intent/tweet?in_reply_to=${id}`],
  ["repost", "reposts", (id) => `https://x.com/intent/retweet?tweet_id=${id}`],
  ["like", "likes", (id) => `https://x.com/intent/like?tweet_id=${id}`],
  ["views", "views", (id) => `https://x.com/i/status/${id}`],
];

/** The action bar: counts as X shows them; the moment they were taken is in the tooltip. */
function XActions(props: { metrics?: Metrics; url?: string; focused?: boolean }) {
  const [copied, setCopied] = createSignal(false);
  let timer: number | undefined;
  onCleanup(() => clearTimeout(timer));
  async function share(url: string) {
    if (navigator.share) return navigator.share({ url }).catch(() => undefined);
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(timer);
      timer = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser.
    }
  }
  const id = () => props.url?.match(STATUS_ID)?.[1];
  const asOf = () =>
    props.metrics ? t().metrics.asOf(formatDate(new Date(props.metrics.capturedAt), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })) : undefined;
  const stop = (event: MouseEvent) => event.stopPropagation();
  return (
    <div class="x-actions" title={asOf()}>
      {/* a focused post has its views in the line above, as on X, so its bar has no views action */}
      <For each={props.focused ? ACTIONS.filter(([icon]) => icon !== "views") : ACTIONS}>
        {([icon, key, href]) => {
          const value = () => (key && props.metrics ? (props.metrics[key] as number | undefined) : undefined);
          return (
            <a class="x-action" data-action={icon} href={id() ? href(id()!) : props.url} target="_blank" rel="noreferrer" aria-label={t().xAction[icon]} onClick={stop}>
              <Icon name={icon} />
              <Show when={value() !== undefined && value()! > 0}>
                <span>{formatTightCount(value()!)}</span>
              </Show>
            </a>
          );
        }}
      </For>
      <span class="x-action-end">
        <a class="x-action" data-action="bookmark" href={props.url} target="_blank" rel="noreferrer" aria-label={t().xAction.bookmark} onClick={stop}>
          <Icon name="bookmark" />
        </a>
        <button
          class="x-action"
          data-action="share"
          aria-label={t().xAction.share}
          onClick={(event) => {
            stop(event);
            if (props.url) void share(props.url);
          }}
        >
          <Icon name="share" />
        </button>
        <span class="copy-status" role="status">{copied() ? t().copied : ""}</span>
      </span>
    </div>
  );
}

/** Someone's post inside Theo's, as X nests a quote. */
function XQuote(props: { post: ForeignPost | "unavailable" }) {
  return (
    <Show
      when={props.post !== "unavailable" && props.post}
      fallback={<div class="x-quote x-unavailable">{t().postFailed}</div>}
    >
      {(post) => (
        <a class="x-quote" href={post().url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
          <div class="x-quote-head">
            <XAvatar post={post()} small />
            <span class="x-name">{post().name ?? post().author.replace(/^@/, "")}</span>
            <span class="x-handle">{post().author}</span>
          </div>
          <Show when={post().text}>{(text) => <XText text={text()} />}</Show>
          <XMedia urls={post().media ?? []} />
        </a>
      )}
    </Show>
  );
}

/** One post in a conversation: avatar column with the thread line, then the post. */
function XStep(props: {
  post: ForeignPost;
  at?: Date;
  href?: string;
  line: boolean;
  text?: string;
  media?: string[];
  metrics?: Metrics;
  above?: string;
  focused?: boolean;
  /** the post being answered, shown for context in the feed: shorter, without the action bar */
  context?: boolean;
  /** part of a feed card, which opens our page for it: X is the name, the time and the actions */
  inCard?: boolean;
  children?: any;
}) {
  return (
    <article class={{ "x-post": true, threaded: props.line, focused: !!props.focused, context: !!props.context }} {...(props.inCard ? {} : openOnX(props.href))}>
      <Show when={props.above}>
        <div class="x-social">
          <Icon name="repost" />
          <span>{props.above}</span>
        </div>
      </Show>
      <div class="x-side">
        <XAvatar post={props.post} />
        <Show when={props.line}>
          <span class="x-line" />
        </Show>
      </div>
      <div class="x-body">
        <XHeader post={props.post} at={props.focused ? undefined : props.at} href={props.href} />
        <Show when={props.text}>{(text) => <XText text={text()} />}</Show>
        <XMedia urls={props.media ?? []} />
        {props.children}
        <Show when={props.focused && props.at}>
          {(at) => (
            <div class="x-stamp">
              <a href={props.href} target="_blank" rel="noreferrer">
                {formatDate(at(), { hour: "numeric", minute: "2-digit" })} · {formatDate(at(), { month: "short", day: "numeric", year: "numeric" })}
              </a>
              <Show when={props.metrics?.views}>
                {(views) => (
                  <>
                    {" · "}
                    <strong>{formatCount(views())}</strong> {t().xViews}
                  </>
                )}
              </Show>
            </div>
          )}
        </Show>
        {/* no numbers, no bar: a row of bare icons says nothing */}
        <Show when={!props.context && props.metrics}>
          <XActions metrics={props.metrics} url={props.href} focused={props.focused} />
        </Show>
      </div>
    </article>
  );
}

function TheoPost(props: { item: Item; prev?: Item; line: boolean; focused?: boolean }) {
  const quotesPrev = () => props.prev !== undefined && previous(props.item) === props.prev && !!props.item.quoted;
  const original = () =>
    props.item.kind === "repost" && props.item.quoted && props.item.quoted !== "unavailable" ? props.item.quoted : undefined;
  return (
    <Show
      when={original()}
      fallback={
        <XStep
          post={THEO}
          at={props.item.createdAt}
          href={props.item.url}
          line={props.line}
          focused={props.focused}
          text={props.item.text}
          media={props.item.media}
          metrics={props.item.metrics}
        >
          <Show when={props.item.quoted}>
            {(quoted) => (
              <Show when={!quotesPrev()} fallback={<p class="x-note">{t().quotesAbove}</p>}>
                <XQuote post={quoted()} />
              </Show>
            )}
          </Show>
        </XStep>
      }
    >
      {(post) => (
        <XStep
          post={post()}
          href={post().url ?? props.item.url}
          line={props.line}
          text={post().text}
          media={post().media}
          metrics={props.item.metrics}
          above={t().reposted}
        />
      )}
    </Show>
  );
}

/** Theo's posts in an entry as one X conversation, starting from the post he answered. */
export function XThread(props: { entry: Entry }) {
  return (
    <div class="x-card">
      <For each={props.entry.items}>
        {(item, index) => {
          const parent = () => (!answersFeed(item) ? item.parent : undefined);
          const last = () => index() === props.entry.items.length - 1;
          return (
            <>
              <Show when={parent()}>
                {(post) => (
                  <Show
                    when={post() !== "unavailable" && (post() as ForeignPost)}
                    fallback={<p class="x-note">{t().parentFailed}</p>}
                  >
                    {(known) => <XStep post={known()} href={known().url} line text={known().text} media={known().media} />}
                  </Show>
                )}
              </Show>
              <TheoPost item={item} prev={props.entry.items[index() - 1]} line={!last()} focused={last()} />
            </>
          );
        }}
      </For>
    </div>
  );
}

/**
 * The latest post of an entry, cut to a few lines for the feed. The post it answers sits
 * above it on the thread line, as X shows a reply with its context.
 */
export function XCompact(props: { item: Item; lines?: number }) {
  const parent = () => (props.item.parent && props.item.parent !== "unavailable" ? props.item.parent : undefined);
  const original = () =>
    props.item.kind === "repost" && props.item.quoted && props.item.quoted !== "unavailable" ? props.item.quoted : undefined;
  const quoted = () => (props.item.kind === "quote" ? props.item.quoted : undefined);
  const author = () => original() ?? THEO;
  return (
    <div
      class="x-card compact"
      style={{ "--x-lines": String(props.lines ?? 6) }}
      // in a feed card the links to X (the name, the time, the actions) stay for a click, but Tab
      // goes from card to card past them: the card itself opens our page, which has them all
      ref={(el) => queueMicrotask(() => el.querySelectorAll<HTMLElement>("a, button").forEach((link) => (link.tabIndex = -1)))}
    >
      <Show when={parent()}>
        {(post) => <XStep post={post()} href={post().url} line context inCard text={post().text} />}
      </Show>
      <XStep
        post={author()}
        at={original() ? undefined : props.item.createdAt}
        href={original()?.url ?? props.item.url}
        line={false}
        inCard
        text={original()?.text ?? props.item.text}
        media={(original()?.media ?? props.item.media).slice(0, 1)}
        metrics={props.item.metrics}
        above={original() ? t().reposted : undefined}
      >
        <Show when={quoted()}>{(post) => <XQuote post={post()} />}</Show>
      </XStep>
    </div>
  );
}
