import { createSignal } from "solid-js";

/**
 * Dragging tags and chips toward the search box, on pointer events rather than the
 * browser's drag and drop: one path for mouse and finger, and the source may vanish
 * mid-drag (a carried chip leaves the box) without ending it. Once the pointer has moved
 * past a few pixels, its capture goes to a hidden proxy element, as solid-dnd does in
 * app-game; a copy of the source follows the pointer.
 *
 * Drop places mark themselves with `data-drop="<key>"`; whoever owns them registers one
 * handler with `onDrop` and reads `over()` to light the place under the pointer.
 */
export type Dragged =
  | { kind: "chip"; clause: number; term: number; part?: number; raw: string; neg: boolean }
  | { kind: "tag"; tag: string };

const [dragged, setDragged] = createSignal<Dragged | undefined>();
const [over, setOver] = createSignal<string | undefined>();
export { dragged, over };

/** Where it was let go: a drop place key, "outside" for anywhere off the box, or nothing. */
export type DropHandler = (what: Dragged, key: string | undefined, x: number, y: number) => void;
let handler: DropHandler | undefined;
let outsideTest: ((x: number, y: number) => boolean) | undefined;

export function onDrop(drop: DropHandler, isOutside: (x: number, y: number) => boolean) {
  handler = drop;
  outsideTest = isOutside;
  return () => {
    if (handler === drop) handler = outsideTest = undefined;
  };
}

const THRESHOLD = 6;
/** How long a finger rests on a tag before it is picked up (the page scrolls under a quicker swipe). */
export const HOLD_MS = 450;

let proxy: HTMLDivElement | undefined;
function getProxy(): HTMLDivElement {
  if (!proxy) {
    proxy = document.createElement("div");
    proxy.setAttribute("aria-hidden", "true");
    proxy.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.append(proxy);
  }
  return proxy;
}

/** A drop place under the pointer wins, even one hanging out of the box (the "or" tabs); then off the box. */
function keyAt(x: number, y: number): string | undefined {
  const place = (document.elementFromPoint(x, y)?.closest("[data-drop]") as HTMLElement | null)?.dataset.drop;
  return place ?? (outsideTest?.(x, y) ? "outside" : undefined);
}

// the click that ends a drag is not a click
let swallowClick = false;
window.addEventListener(
  "click",
  (event) => {
    if (!swallowClick) return;
    swallowClick = false;
    event.preventDefault();
    event.stopPropagation();
  },
  true,
);

/**
 * Handlers for an element that can be dragged; the mouse always drags. A finger drags at
 * once, or with `touch: "hold"` only after resting on it for HOLD_MS: a swipe before that
 * scrolls the page (a tag row has to scroll), and a hold let go without moving calls
 * `onHeld` (the tag menu).
 */
export function draggable(
  what: () => Dragged,
  options: { touch?: true | "hold"; onHeld?: (source: HTMLElement, x: number, y: number) => void } = {},
) {
  return {
    draggable: "false" as const,
    onDragStart: (event: DragEvent) => event.preventDefault(),
    onPointerDown: (event: PointerEvent) => {
      if (event.button !== 0) return;
      const source = event.currentTarget as HTMLElement;
      const start = { x: event.clientX, y: event.clientY };
      const pointer = event.pointerId;
      let ghost: HTMLElement | undefined;
      let offset = { x: 0, y: 0 };
      let target: HTMLElement = source;
      // a finger on a "hold" element is armed once it has rested there
      let armed = event.pointerType === "mouse" || options.touch !== "hold";
      const timer = armed
        ? undefined
        : window.setTimeout(() => {
            armed = true;
            source.setAttribute("data-held", "");
            navigator.vibrate?.(10);
          }, HOLD_MS);
      try {
        source.setPointerCapture(pointer);
      } catch {
        // a pointer the browser no longer tracks; window listeners below still see it
      }

      const begin = () => {
        source.removeAttribute("data-held");
        const box = source.getBoundingClientRect();
        offset = { x: start.x - box.left, y: start.y - box.top };
        ghost = source.cloneNode(true) as HTMLElement;
        ghost.classList.add("drag-ghost");
        ghost.style.width = `${box.width}px`;
        document.body.append(ghost);
        source.setAttribute("data-drag-source", "");
        // from here the proxy holds the pointer, so the source can leave the page
        const next = getProxy();
        try {
          source.releasePointerCapture(pointer);
          next.setPointerCapture(pointer);
        } catch {
          // capture is a nicety; window listeners carry on without it
        }
        target = next;
        next.addEventListener("lostpointercapture", lost);
        setDragged(what());
      };

      const move = (e: PointerEvent) => {
        if (e.pointerId !== pointer) return;
        const far = Math.hypot(e.clientX - start.x, e.clientY - start.y) >= THRESHOLD;
        // a swipe before the hold: the page scrolls, nothing is dragged
        if (!armed) return far && finish(e, false);
        if (!dragged() && !far) return;
        if (!dragged()) begin();
        e.preventDefault();
        ghost!.style.transform = `translate(${e.clientX - offset.x}px, ${e.clientY - offset.y}px)`;
        setOver(keyAt(e.clientX, e.clientY));
      };

      const finish = (e: Event, drop: boolean) => {
        window.clearTimeout(timer);
        source.removeAttribute("data-held");
        window.removeEventListener("touchmove", noScroll, true);
        window.removeEventListener("contextmenu", noMenu, true);
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", up, true);
        window.removeEventListener("pointercancel", cancel, true);
        window.removeEventListener("keydown", escape, true);
        window.removeEventListener("blur", lost);
        target.removeEventListener("lostpointercapture", lost);
        try {
          target.releasePointerCapture(pointer);
        } catch {
          // already released
        }
        const what = dragged();
        ghost?.remove();
        source.removeAttribute("data-drag-source");
        try {
          // the handler still sees the drag as it was, then it ends, whatever the handler does
          if (what && drop && e instanceof PointerEvent) handler?.(what, keyAt(e.clientX, e.clientY), e.clientX, e.clientY);
        } finally {
          setOver(undefined);
          setDragged(undefined);
        }
        // held and let go in place: the press was for the menu
        const held = !what && armed && drop && options.touch === "hold" && event.pointerType !== "mouse" && e instanceof PointerEvent;
        if (held) options.onHeld?.(source, start.x, start.y);
        if (!what && !held) return;
        swallowClick = true;
        setTimeout(() => (swallowClick = false), 0);
      };
      const up = (e: PointerEvent) => e.pointerId === pointer && finish(e, true);
      const cancel = (e: PointerEvent) => e.pointerId === pointer && finish(e, false);
      const escape = (e: KeyboardEvent) => e.key === "Escape" && dragged() && finish(e, false);
      // the window lost focus or the pointer (a screenshot tool, an alert): the drag ends, nothing drops
      const lost = (e: Event) => dragged() && finish(e, false);

      // once armed, a moving finger drags instead of scrolling: the page has not started to
      // scroll while it rested, and a cancelled touchmove keeps it from starting
      const noScroll = (e: TouchEvent) => armed && e.cancelable && e.preventDefault();
      // the phone's own long-press menu would end the press; the hold has its own menu
      const noMenu = (e: Event) => {
        if (event.pointerType === "mouse") return;
        e.preventDefault();
        e.stopPropagation();
      };

      window.addEventListener("touchmove", noScroll, { capture: true, passive: false });
      window.addEventListener("contextmenu", noMenu, true);
      window.addEventListener("pointermove", move, true);
      window.addEventListener("pointerup", up, true);
      window.addEventListener("pointercancel", cancel, true);
      window.addEventListener("keydown", escape, true);
      window.addEventListener("blur", lost);
    },
  };
}
