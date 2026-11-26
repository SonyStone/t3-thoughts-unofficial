import { items as rawItems } from "virtual:content";
import type { ForeignPost, RawItem } from "./types";

export type { ForeignPost, Kind, Metrics } from "./types";

export type Item = Omit<RawItem, "createdAt"> & { createdAt: Date };

/** A Theo post plus his own posts in content/ that reply to or quote it, oldest first. */
export type Entry = {
  items: Item[];
  latest: Item;
  /** feed day: the day of the latest post, so a thread surfaces when it grows */
  day: string;
};

const STATUS_ID = /\/status\/(\d+)/;

export const items: Item[] = rawItems.map((item) => ({ ...item, createdAt: new Date(item.createdAt) }));

const byId = new Map(items.map((item) => [item.id, item]));

/** Look up any item in content/ by its id (used by arcs to link to existing post breakdowns). */
export function itemById(id: string): Item | undefined {
  return byId.get(id);
}

function linked(post: ForeignPost | "unavailable" | undefined): Item | undefined {
  if (!post || post === "unavailable") return undefined;
  const id = post.url?.match(STATUS_ID)?.[1];
  return id ? byId.get(id) : undefined;
}

/** True when the post Theo answered is itself in content/, so the feed already shows it. */
export function answersFeed(item: Item): boolean {
  return linked(item.parent) !== undefined;
}

/** The earlier Theo post this one answers or quotes, if it is in content/ too. */
export function previous(item: Item): Item | undefined {
  return linked(item.parent) ?? linked(item.quoted);
}

function root(item: Item): Item {
  const seen = new Set([item]);
  let current = item;
  for (let up = previous(current); up && !seen.has(up); up = previous(current)) {
    seen.add(up);
    current = up;
  }
  return current;
}

const groups = new Map<string, Item[]>();
for (const item of items) {
  const key = root(item).id;
  groups.set(key, [...(groups.get(key) ?? []), item]);
}

export const entries: Entry[] = [...groups.values()]
  .map((list) => {
    const sorted = list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const latest = sorted[sorted.length - 1];
    return { items: sorted, latest, day: latest.day };
  })
  .sort((a, b) => b.latest.createdAt.getTime() - a.latest.createdAt.getTime());

/** Title, summary and analysis in `lang`, falling back to the English original. */
export function localized(item: Item, lang: string): { title: string; summary?: string; html: string; fallback: boolean } {
  if (lang === "en") return { title: item.title, summary: item.summary, html: item.html, fallback: false };
  const translation = item.translations[lang];
  return translation ? { ...translation, summary: translation.summary ?? item.summary, fallback: false } : { title: item.title, summary: item.summary, html: item.html, fallback: true };
}

export type MetricKey = "likes" | "views" | "replies" | "reposts" | "quotes" | "bookmarks" | "comments";

/** The best number among an entry's posts, -1 when none has it. */
export function entryMetric(entry: Entry, key: MetricKey): number {
  return Math.max(-1, ...entry.items.map((item) => item.metrics?.[key] ?? -1));
}
