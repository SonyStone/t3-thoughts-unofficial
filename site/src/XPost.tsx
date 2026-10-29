import { createSignal, For, Show } from "solid-js";
import { answersFeed, previous, type Entry, type ForeignPost, type Item, type Metrics } from "./content";
import { formatCount, formatDate, t } from "./i18n";
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

function XHeader(props: { post: ForeignPost; at?: Date; href?: string }) {
  return (
    <div class="x-head">
      <a class="x-name" href={props.post.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
        {props.post.name ?? props.post.author.replace(/^@/, "")}
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
  return {
    role: "link" as const,
    tabindex: "0",
    onClick: (event: MouseEvent) => {
      event.stopPropagation();
      if (url && !(event.target as HTMLElement).closest("a, button")) window.open(url, "_blank", "noopener");
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
const ACTIONS: [IconName, keyof Metrics | undefined, (id: string) => string][] = [
  ["reply", "replies", (id) => `https://x.com/intent/tweet?in_reply_to=${id}`],
  ["repost", "reposts", (id) => `https://x.com/intent/retweet?tweet_id=${id}`],
  ["like", "likes", (id) => `https://x.com/intent/like?tweet_id=${id}`],
  ["views", "views", (id) => `https://x.com/i/status/${id}`],
];

async function share(url: string) {
  if (navigator.share) await navigator.share({ url }).catch(() => undefined);
  else await navigator.clipboard?.writeText(url);
}

/** The action bar: counts as X shows them; the moment they were taken is in the tooltip. */
function XActions(props: { metrics?: Metrics; url?: string }) {
  const id = () => props.url?.match(STATUS_ID)?.[1];
  const asOf = () =>
    props.metrics ? t().metrics.asOf(formatDate(new Date(props.metrics.capturedAt), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })) : undefined;
  const stop = (event: MouseEvent) => event.stopPropagation();
  return (
    <div class="x-actions" title={asOf()}>
      <For each={ACTIONS}>
        {([icon, key, href]) => {
          const value = () => (key && props.metrics ? (props.metrics[key] as number | undefined) : undefined);
          return (
            <a class="x-action" data-action={icon} href={id() ? href(id()!) : props.url} target="_blank" rel="noreferrer" aria-label={icon} onClick={stop}>
              <Icon name={icon} />
              <Show when={value() !== undefined && value()! > 0}>
                <span>{formatCount(value()!)}</span>
              </Show>
            </a>
          );
        }}
      </For>
      <span class="x-action-end">
        <a class="x-action" data-action="bookmark" href={props.url} target="_blank" rel="noreferrer" aria-label="bookmark" onClick={stop}>
          <Icon name="bookmark" />
        </a>
        <button
          class="x-action"
          data-action="share"
          aria-label="share"
          onClick={(event) => {
            stop(event);
            if (props.url) void share(props.url);
          }}
        >
          <Icon name="share" />
        </button>
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
  children?: any;
}) {
  return (
    <article class={{ "x-post": true, threaded: props.line, focused: !!props.focused }} {...openOnX(props.href)}>
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
        <XActions metrics={props.metrics} url={props.href} />
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
 * above as one muted line, the way X shows context in a timeline.
 */
export function XCompact(props: { item: Item; lines?: number }) {
  const parent = () => (props.item.parent && props.item.parent !== "unavailable" ? props.item.parent : undefined);
  const original = () =>
    props.item.kind === "repost" && props.item.quoted && props.item.quoted !== "unavailable" ? props.item.quoted : undefined;
  const quoted = () => (props.item.kind === "quote" ? props.item.quoted : undefined);
  const author = () => original() ?? THEO;
  return (
    <div class="x-card compact" style={{ "--x-lines": String(props.lines ?? 6) }}>
      <Show when={parent()}>
        {(post) => (
          <div class="x-context" {...openOnX(post().url)}>
            <span>{t().replyingTo}</span> <a href={post().url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{post().author}</a>
            <Show when={post().text}>
              {(text) => <span class="x-context-text">{text()}</span>}
            </Show>
          </div>
        )}
      </Show>
      <XStep
        post={author()}
        at={original() ? undefined : props.item.createdAt}
        href={original()?.url ?? props.item.url}
        line={false}
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
