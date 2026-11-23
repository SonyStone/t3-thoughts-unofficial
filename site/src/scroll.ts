import type { Route } from "./route";

/**
 * Where the page stands after the route changes. The feed has two places to be: at the top,
 * on the video, or reading, with the search stuck to the top of the window. The other pages
 * have the search at the top too, so the search keeps its place across them:
 * - a new query keeps the scroll, but a reader deep in the results goes to the start of the
 *   new ones, so the search never drops back to the middle of the window;
 * - the feed opens where it was left in reading mode, if the query is the same;
 * - otherwise it opens reading, at the start of its results.
 * The brand link is the way up to the video (toTheVideo).
 */

// where the reader was in the feed, if reading, so coming back from a post lands on the same tile
let left: { q: string; y: number } | undefined;
let video = false;

/** The scroll at which the search is stuck to the top and the results start right under it. */
export function readingTop(): number {
  const results = document.querySelector<HTMLElement>(".results");
  if (!results) return 0;
  return results.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(results).scrollMarginTop);
}

/** The search is stuck to the top. */
function reading(): boolean {
  const bar = document.querySelector(".bar");
  return !!bar && window.scrollY > 0 && bar.getBoundingClientRect().top <= 0;
}

/** The next time the feed opens, it opens on the video. */
export function toTheVideo() {
  video = true;
}

/** Where the other pages were left (Tags, Stats, a post), for Back to put them back there. */
const places = new Map<string, number>();
const placeOf = (route: Route) => `${route.page}/${route.id ?? ""}`;

/** What the last press or key was on: what led to a new page. */
let usedLast: Element | null = null;
let usedAt = 0;
const noteUse = (event: Event) => {
  usedLast = event.target instanceof Element ? event.target : null;
  usedAt = performance.now();
};
/** The search or a tag's menu was what led here (just now: a Back pressed later is not that). */
const ledBySearch = () => performance.now() - usedAt < 1000 && !!usedLast?.closest(".search, .tag-menu");
window.addEventListener("pointerdown", noteUse, true);
window.addEventListener("keydown", noteUse, true);

export function placeScroll(prev: Route, next: Route, stepped = false) {
  if (prev.page === "feed" && next.page !== "feed") left = reading() ? { q: prev.q, y: window.scrollY } : undefined;
  if (prev.page !== "feed") places.set(placeOf(prev), window.scrollY);
  const back = stepped && next.page !== "feed" ? places.get(placeOf(next)) : undefined;
  const samePage = next.page === prev.page && next.id === prev.id;
  const top = video;
  video = false;
  // after the new page or results are on screen
  requestAnimationFrame(() => {
    if (samePage) {
      if (next.page === "feed") window.scrollTo(0, Math.min(window.scrollY, readingTop()));
    } else if (back !== undefined) {
      window.scrollTo(0, back);
    } else if (next.page !== "feed" || top) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo(0, left?.q === next.q ? left.y : readingTop());
      // back from a post: the focus on its card, so Tab goes on from there, not from the top
      // (to the same results: a new search from the post starts from the top of its own)
      // (unless the way back was the search or a tag's menu: the focus stays with what was used;
      // Back or Forward is the browser's, whatever was pressed before it)
      // (and only a card in sight: one far down would pull the page to it on the next Tab)
      const card = document.querySelector<HTMLElement>(`[data-posts~="${CSS.escape(prev.id ?? "")}"] .entry-title a`);
      const box = card?.getBoundingClientRect();
      const inSight = !!box && box.bottom > 0 && box.top < window.innerHeight;
      if (prev.page === "post" && prev.q === next.q && inSight && !document.activeElement?.closest(".search") && (stepped || !ledBySearch())) card!.focus({ preventScroll: true });
    }
  });
}
