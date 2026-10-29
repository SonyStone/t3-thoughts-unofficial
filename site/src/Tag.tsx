import { Show } from "solid-js";
import { vocabulary } from "virtual:content";
import type { Described } from "./types";
import { lang } from "./i18n";
import { applyTag, hasTag } from "./clauses";
import { feedHref, route } from "./route";
import { openTagMenu } from "./TagMenu";
import { namespaceOf } from "./search";

/** Display order of namespaces; a tag without one is a topic. */
export const NAMESPACES = ["product", "model", "company", "person", "tech", "mood", "format", "sponsor", "topic"];

/** A tags.yaml description in the current language, English when it has none. */
export function describe(value: Described | undefined): string | undefined {
  if (value === undefined || typeof value === "string") return value;
  return value[lang()] ?? value.en;
}

export function namespaceKey(tag: string): string {
  return namespaceOf(tag) ?? "topic";
}

export function sortTags(tags: string[]): string[] {
  return [...tags].sort(
    (a, b) => NAMESPACES.indexOf(namespaceKey(a)) - NAMESPACES.indexOf(namespaceKey(b)) || a.localeCompare(b),
  );
}

/**
 * A tag narrows the current search by itself (a click) and opens the and/or/not menu
 * (a right click), colored by namespace as on derpibooru.
 */
export function Tag(props: { tag: string; count?: number }) {
  const ns = () => namespaceOf(props.tag);
  return (
    <a
      class={{ tag: true, active: hasTag(route().q, props.tag) }}
      data-ns={namespaceKey(props.tag)}
      href={feedHref(applyTag(route().q, props.tag, "and"))}
      title={describe(vocabulary.tags[props.tag])}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => openTagMenu(event, props.tag)}
    >
      <Show when={ns()}>
        <span class="tag-ns">{ns()}:</span>
      </Show>
      {ns() ? props.tag.slice(ns()!.length + 1) : props.tag}
      <Show when={props.count !== undefined}>
        <span class="tag-count">{props.count}</span>
      </Show>
    </a>
  );
}
