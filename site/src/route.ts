import { createSignal } from "solid-js";
import { placeScroll } from "./scroll";

/**
 * Hash routes, so the static build works from any folder:
 * #/, #/?q=opus, #/post/<post id>?q=opus, #/tags, #/stats.
 * The query rides along on every page, so going back to the feed keeps the search.
 */
export type Page = "feed" | "post" | "tags" | "stats";
export type Route = { page: Page; q: string; id?: string };

function read(): Route {
  // at the first "?" only: a query pasted by hand can have one of its own (text:"why? really")
  const hash = location.hash.replace(/^#/, "");
  const cut = hash.indexOf("?");
  const [path, search] = cut < 0 ? [hash, ""] : [hash.slice(0, cut), hash.slice(cut + 1)];
  const params = new URLSearchParams(search);
  const q = params.get("q") ?? "";
  const post = path.match(/^\/(?:post|arc)\/([\w-]+)$/);
  if (post) return { page: "post", q, id: post[1] };
  // links from before entries had pages of their own: #/?open=<id>
  const open = params.get("open");
  if (open) return { page: "post", q, id: open };
  return { page: path === "/tags" ? "tags" : path === "/stats" ? "stats" : "feed", q };
}

const [route, setRoute] = createSignal(read());

// a query set but not yet in route(): the hash changes asynchronously, and several chips
// can be committed before it does (typing "opus -codex " commits two)
let pending: string | undefined;

/** The query as of the last change, including one the address has not caught up with. */
export function currentQuery(): string {
  return pending ?? route().q;
}

/**
 * Whether the address came from Back or Forward, for a page left before to be put back where it
 * was scrolled to (scroll.ts): every entry gets a mark when first seen, and only one stepped back
 * to has it already. (Chrome fires popstate for a plain change of the hash too, so that says nothing.)
 */
function seenBefore(): boolean {
  const state = history.state as { seen?: true } | null;
  if (state?.seen) return true;
  history.replaceState({ ...(state ?? {}), seen: true }, "");
  // Back and Forward put pages where they were left (scroll.ts); the browser's own restoring would
  // move the page before the change is seen, and the place of the page left would be lost. It is
  // a setting of each entry, so each new one gets it.
  history.scrollRestoration = "manual";
  return false;
}
seenBefore();

window.addEventListener("hashchange", () => {
  const step = seenBefore();
  pending = undefined;
  const prev = route();
  const next = read();
  // the address put back as it was (Back on the search screen): nothing moves
  if (next.page === prev.page && next.q === prev.q && next.id === prev.id) return;
  // before the feed goes off the page: it notes where the feed was left
  placeScroll(prev, next, step);
  setRoute(next);
});

export { route };

export function withQuery(path: string, q: string): string {
  return q ? `#${path}?${new URLSearchParams({ q })}` : `#${path}`;
}

export function feedHref(q: string): string {
  return withQuery("/", q);
}

export function postHref(id: string, kind?: string): string {
  return withQuery(`/${kind === "arc" ? "arc" : "post"}/${id}`, route().q);
}

/**
 * A deliberate change (a tag click, a chip menu): one history entry, so Back undoes it. On a
 * phone's search screen, the screen's own entry instead (see `openScreen`).
 */
export function setQuery(q: string) {
  pending = q;
  go(feedHref(q));
}

export function openEntry(id: string, kind?: string) {
  go(postHref(id, kind));
}

/**
 * A phone's search screen (SearchBox: editing) is one step in the history, however many changes
 * are made on it: it opens an entry of its own, every change replaces that entry, and Back
 * closes the screen (`onBack`) as Done does, keeping the query as edited (in place of the query
 * from before it). Closed with nothing changed, it takes its entry back out, so Back does not
 * stop on the same page. On a desktop
 * the search is part of the page, and each change stays a step of its own, for Back to undo.
 */
let screen: { from: string; at: string } | undefined;
let onBack: (() => void) | undefined;
// the step back that takes an unchanged screen's entry out: no Back to answer
let unstep = false;
// a change of the address made here: it fires popstate too, at once, and is not a Back
let going = false;
// Back is closing the screen: what that changes replaces the entry Back landed on
let backing = false;

/** Whether the address is being changed from here right now (Chrome's popstate for it is not a Back). */
export const changingHere = () => going;

/** The feed with no query is `#/`, and the site opened with no hash at all is the same place. */
const same = (a: string, b: string) => (a || "#/") === (b || "#/");

function go(hash: string) {
  going = true;
  try {
    if (!screen) location.hash = hash;
    else {
      location.replace(hash);
      screen.at = location.hash;
    }
  } finally {
    going = false;
  }
}

/** Opens the search screen's entry; what it returns closes it. */
export function openScreen(back: () => void): () => void {
  history.pushState(history.state, "");
  const opened = { from: location.hash, at: location.hash };
  screen = opened;
  onBack = back;
  return () => {
    if (screen !== opened || backing) return;
    screen = undefined;
    onBack = undefined;
    if (same(opened.at, opened.from)) {
      unstep = true;
      history.back();
    }
  };
}

window.addEventListener("popstate", () => {
  if (going) return;
  if (unstep) {
    unstep = false;
    return;
  }
  const back = onBack;
  if (!screen || !back) return;
  // Back has left the screen's entry: the edited query takes the place of the one before it, and
  // what closing the screen still changes (the text in the field) goes there too. Not a new
  // entry: one pushed here, with no tap behind it, makes Chrome on Android skip the entry
  // before it, and the next Back leaves the site.
  // The screen stays set while it closes, so the text left in the field replaces this entry too.
  if (!same(screen.at, screen.from)) history.replaceState({ ...(history.state ?? {}), seen: true }, "", screen.at);
  onBack = undefined;
  backing = true;
  try {
    back();
  } finally {
    backing = false;
    screen = undefined;
  }
});

// on the screen, a link on the same page (a tag in the list) changes the screen's entry too
document.addEventListener(
  "click",
  (event) => {
    if (!screen || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest?.<HTMLAnchorElement>("a[href^='#']");
    if (!link || link.target) return;
    event.preventDefault();
    go(link.getAttribute("href")!);
  },
  true,
);
