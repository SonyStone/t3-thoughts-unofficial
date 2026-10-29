import { createSignal } from "solid-js";

/** Reader choices that outlive a visit: how the feed is laid out and how the tag cloud is ordered. */
function stored<T extends string>(key: string, values: readonly T[], fallback: T) {
  const saved = localStorage.getItem(key) as T | null;
  const [value, setValue] = createSignal<string>(saved && values.includes(saved) ? saved : fallback);
  const set = (next: T) => {
    localStorage.setItem(key, next);
    setValue(next as string);
  };
  return [value as unknown as () => T, set] as const;
}

export const VIEWS = ["tiles", "list"] as const;
export type View = (typeof VIEWS)[number];
export const [view, setView] = stored<View>("t3-thoughts-view", VIEWS, "tiles");

export const CLOUD_SORTS = ["popular", "recent", "name"] as const;
export type CloudSort = (typeof CLOUD_SORTS)[number];
export const [cloudSort, setCloudSort] = stored<CloudSort>("t3-thoughts-cloud-sort", CLOUD_SORTS, "popular");
