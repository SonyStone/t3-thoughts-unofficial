import { createSignal } from "solid-js";

/**
 * Hash routes, so the static build works from any folder:
 * #/, #/?q=opus, #/post/<post id>?q=opus, #/tags, #/stats.
 * The query rides along on every page, so going back to the feed keeps the search.
 */
export type Page = "feed" | "post" | "tags" | "stats";
export type Route = { page: Page; q: string; id?: string };

function read(): Route {
  const [path, search = ""] = location.hash.replace(/^#/, "").split("?");
  const params = new URLSearchParams(search);
  const q = params.get("q") ?? "";
  const post = path.match(/^\/post\/([\w-]+)$/);
  if (post) return { page: "post", q, id: post[1] };
  // links from before entries had pages of their own: #/?open=<id>
  const open = params.get("open");
  if (open) return { page: "post", q, id: open };
  return { page: path === "/tags" ? "tags" : path === "/stats" ? "stats" : "feed", q };
}

const [route, setRoute] = createSignal(read());

// where the reader was in the feed, so coming back from a post lands on the same tile
let feedScroll: { q: string; y: number } | undefined;

window.addEventListener("hashchange", () => {
  const prev = route();
  const next = read();
  if (prev.page === "feed" && next.page !== "feed") feedScroll = { q: prev.q, y: window.scrollY };
  setRoute(next);
  // a new page starts at the top (or where the feed was left); a new query on the same page keeps the scroll
  if (next.page === prev.page && next.id === prev.id) return;
  const y = next.page === "feed" && feedScroll?.q === next.q ? feedScroll.y : 0;
  requestAnimationFrame(() => window.scrollTo(0, y));
});

export { route };

function withQuery(path: string, q: string): string {
  return q ? `#${path}?${new URLSearchParams({ q })}` : `#${path}`;
}

export function feedHref(q: string): string {
  return withQuery("/", q);
}

export function postHref(id: string): string {
  return withQuery(`/post/${id}`, route().q);
}

/** A deliberate change (a tag click, a chip menu): one history entry, so Back undoes it. */
export function setQuery(q: string) {
  location.hash = feedHref(q);
}

export function openEntry(id: string) {
  location.hash = postHref(id);
}
