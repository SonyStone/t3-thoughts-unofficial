import { createSignal } from "solid-js";

/**
 * Hash routes, so the static build works from any folder:
 * #/, #/?q=opus, #/?q=opus&open=<post id>, #/tags, #/stats.
 */
export type Route = { page: "feed" | "tags" | "stats"; q: string; open?: string };

function read(): Route {
  const [path, search = ""] = location.hash.replace(/^#/, "").split("?");
  const page = path === "/tags" ? "tags" : path === "/stats" ? "stats" : "feed";
  const params = new URLSearchParams(search);
  return { page, q: params.get("q") ?? "", open: params.get("open") ?? undefined };
}

const [route, setRoute] = createSignal(read());
window.addEventListener("hashchange", () => setRoute(read()));

export { route };

export function feedHref(q: string, open?: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (open) params.set("open", open);
  const search = params.toString();
  return search ? `#/?${search}` : "#/";
}

/** While typing: update the address without a history entry per keystroke. */
export function replaceQuery(q: string) {
  history.replaceState(null, "", feedHref(q));
  setRoute(read());
}

/** A deliberate change (a tag click, a chip menu): one history entry, so Back undoes it. */
export function setQuery(q: string) {
  location.hash = feedHref(q);
}

export function openEntry(id: string) {
  location.hash = feedHref(route().q, id);
}

export function closeEntry() {
  location.hash = feedHref(route().q);
}
