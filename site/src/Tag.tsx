import { Show } from "solid-js";
import { vocabulary } from "virtual:content";
import type { Described } from "./types";
import { lang, t } from "./i18n";
import { applyTag, excludesTag, uses } from "./clauses";
import { feedHref, route } from "./route";
import { draggable } from "./drag";
import { openAt, openTagMenu } from "./TagMenu";
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

/** A tag's text: the namespace muted, then the name. */
export function TagLabel(props: { tag: string }) {
  const ns = () => namespaceOf(props.tag.replace(/^[-!]/, ""));
  return (
    <>
      <Show when={ns()}>
        <span class="tag-ns">{ns()}:</span>
      </Show>
      <span class="tag-name">{ns() ? props.tag.slice(props.tag.indexOf(":") + 1) : props.tag}</span>
    </>
  );
}

/**
 * A tag narrows the current search by itself (a click; a second click takes it out again),
 * opens the tag menu (a right click) and can be dragged into the search box. Colored by namespace as on derpibooru.
 */
export function Tag(props: { tag: string; count?: number; implied?: boolean }) {
  // a finger rests on a tag to pick it up; let go in place, that opens the menu (phones have
  // no right click, and their own long-press menu for links would preview the link)
  const drag = draggable(() => ({ kind: "tag", tag: props.tag }), {
    touch: "hold",
    onHeld: (el, x, y) => openAt(el, props.tag, x, y),
  });
  return (
    <a
      // in the search either way, asked for or excluded
      class={{ tag: true, active: uses(route().q, props.tag), excluded: excludesTag(route().q, props.tag), implied: !!props.implied }}
      data-ns={namespaceKey(props.tag)}
      href={feedHref(applyTag(route().q, props.tag, uses(route().q, props.tag) ? "remove" : "and"))}
      title={props.implied ? t().impliedTag : describe(vocabulary.tags[props.tag])}
      draggable={drag.draggable}
      onDragStart={drag.onDragStart}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => openTagMenu(event, props.tag)}
      onPointerDown={drag.onPointerDown}
    >
      <TagLabel tag={props.tag} />
      <Show when={props.count !== undefined}>
        <span class="tag-count">{props.count}</span>
      </Show>
    </a>
  );
}
