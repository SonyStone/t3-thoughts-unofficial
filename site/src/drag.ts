import { createSignal } from "solid-js";

/**
 * What is being dragged toward the search box: a chip already in it (with its place) or a
 * tag from anywhere on the page. The box shows its drop places only while this is set.
 */
export type Dragged = { kind: "chip"; clause: number; term: number; raw: string; neg: boolean } | { kind: "tag"; tag: string };

const [dragged, setDragged] = createSignal<Dragged | undefined>();
export { dragged };

const TYPE = "application/x-t3-tag";

export function startDrag(event: DragEvent, what: Dragged) {
  event.stopPropagation();
  const raw = what.kind === "tag" ? what.tag : what.raw;
  event.dataTransfer?.setData(TYPE, raw);
  event.dataTransfer?.setData("text/plain", raw);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  setDragged(what);
}

export function endDrag() {
  setDragged(undefined);
}

/** Lets a drop happen here; the browser refuses drops unless dragover is cancelled. */
export function allowDrop(event: DragEvent) {
  if (!dragged()) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
}
