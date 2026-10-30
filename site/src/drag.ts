import { createSignal, flush } from "solid-js";

/**
 * Dragging tags and chips toward the search box, on pointer events rather than the
 * browser's drag and drop: one path for mouse and finger, and the source may vanish
 * mid-drag (a carried chip leaves the box) without ending it. Once the pointer has moved
 * past a few pixels, its capture goes to a hidden proxy element, as solid-dnd does in
 * app-game; a copy of the source follows the pointer.
 *
 * Drop places mark themselves with `data-drop="<key>"`; whoever owns them registers one
 * handler with `onDrop` and reads `over()` to light the place under the pointer.
 *
 * The copy lifts off when picked up and tilts with the pointer's speed; let go, it flies
 * to where the drop put it (or back to its source, or fades out when the drop took it away)
 * while the owner slides its pieces from where they stood to where they stand now.
 */
export type Dragged =
  | { kind: "chip"; clause: number; term: number; part?: number; raw: string; neg: boolean }
  | { kind: "tag"; tag: string };

const [dragged, setDragged] = createSignal<Dragged | undefined>();
const [over, setOver] = createSignal<string | undefined>();
export { dragged, over };

/**
 * Where the dropped thing ended up, asked once the page has caught up with the drop: the
 * element to fly the copy to, "gone" when the drop took it away, nothing to send it home.
 */
export type Landing = () => Element | "gone" | null | undefined;
/** Where it was let go: a drop place key, "outside" for anywhere off the box, or nothing. */
export type DropHandler = (what: Dragged, key: string | undefined, x: number, y: number) => Landing | void;
/**
 * The box a drag rearranges. `snapshot` notes where its pieces stand and returns what slides
 * them from there to where they stand after a change (all but `keep`, which the copy lands on);
 * `settled` says the page shows the latest change (a query rides in the address, a moment late).
 */
export type Layout = { snapshot: () => (keep?: Element) => void; settled: () => boolean };
let handler: DropHandler | undefined;
let outsideTest: ((x: number, y: number) => boolean) | undefined;
let layout: Layout | undefined;

export function onDrop(drop: DropHandler, isOutside: (x: number, y: number) => boolean, box?: Layout) {
  handler = drop;
  outsideTest = isOutside;
  layout = box;
  return () => {
    if (handler === drop) handler = outsideTest = layout = undefined;
  };
}

/** The reader asked for less motion: things land where they go, without flying there. */
export const still = window.matchMedia("(prefers-reduced-motion: reduce)");

const THRESHOLD = 6;
/**
 * How long a finger rests on a tag before it is picked up, and how far it may wander meanwhile:
 * a swipe that goes further scrolls the page instead (dnd-kit's touch defaults).
 */
export const HOLD_MS = 250;
const HOLD_SLOP = 5;

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

/** Where the copy hangs from the pointer: the point it was grabbed by, in its own box. */
type Grip = { x: number; y: number };

/**
 * The copy, let go: it waits for the page to catch up with the drop, then lands on what the
 * drop made, flies home to its source, or fades out where it is.
 */
function settle(ghost: HTMLElement, grip: Grip, source: HTMLElement, play: ((keep?: Element) => void) | undefined, landing: Landing | void) {
  if (still.matches) {
    ghost.remove();
    return;
  }
  let frames = 0;
  const go = () => {
    // a query change shows up a frame or two later; past a few frames, land on what there is
    if (layout && !layout.settled() && frames++ < 20) return void requestAnimationFrame(go);
    flush();
    const found = landing?.();
    const home = source.isConnected && source.getBoundingClientRect().width > 0 ? source : undefined;
    const to = found === "gone" ? undefined : (found ?? home);
    play?.(to);
    if (to) fly(ghost, grip, to, to === home && !found);
    else vanish(ghost);
  };
  go();
}

/** The copy flies onto `to`, shrinking to its height, and hands over to it as it arrives. */
function fly(ghost: HTMLElement, grip: Grip, to: Element, home: boolean) {
  const style = getComputedStyle(ghost);
  const scale = parseFloat(style.scale) || 1;
  const rotate = style.rotate === "none" ? "0deg" : style.rotate;
  const shadow = style.boxShadow;
  const from = ghost.style.translate;
  ghost.classList.remove("lifted");
  ghost.style.transition = "none";
  const width = ghost.offsetWidth;
  const height = ghost.offsetHeight;
  const now = ghost.getBoundingClientRect();
  const box = to.getBoundingClientRect();
  const end = box.height / height;
  // the grip is the transform origin: place the copy so its center comes to the target's
  const x = box.left + box.width / 2 - grip.x - end * (width / 2 - grip.x);
  const y = box.top + box.height / 2 - grip.y - end * (height / 2 - grip.y);
  const distance = Math.hypot(box.left + box.width / 2 - (now.left + now.width / 2), box.top + box.height / 2 - (now.top + now.height / 2));
  // a far drop takes longer than a near one, so neither looks rushed (react-beautiful-dnd: 330–550 ms)
  const duration = 260 + (Math.min(distance, 1000) / 1000) * 220;
  Object.assign(ghost.style, { translate: `${x}px ${y}px`, scale: String(end), rotate: "0deg", boxShadow: "none" });
  ghost.animate(
    [
      { translate: from, scale: String(scale), rotate, boxShadow: shadow },
      { translate: `${x}px ${y}px`, scale: String(end), rotate: "0deg", boxShadow: "0 0 0 rgba(0, 0, 0, 0)" },
    ],
    { duration, easing: "cubic-bezier(0.2, 1, 0.1, 1)" },
  );
  // the copy and the chip it lands on may look different (a tag from the page): they cross-fade
  const fade = ghost.animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration, fill: "forwards" });
  fade.onfinish = fade.oncancel = () => ghost.remove();
  // a source going home was dimmed; a new chip was not there at all
  const start = home ? 0.35 : 0;
  to.animate([{ opacity: start }, { opacity: start, offset: 0.4 }, { opacity: 1 }], { duration });
  if (home) return;
  // a short flash says where it went
  window.setTimeout(() => {
    to.setAttribute("data-landed", "");
    window.setTimeout(() => to.removeAttribute("data-landed"), 700);
  }, duration * 0.6);
}

/** Taken away (a chip carried off the box): the copy swells and fades where it was let go. */
function vanish(ghost: HTMLElement) {
  const scale = parseFloat(getComputedStyle(ghost).scale) || 1;
  ghost.style.transition = "none";
  const fade = ghost.animate(
    [
      { opacity: 1, scale: String(scale) },
      { opacity: 0, scale: String(scale * 1.25) },
    ],
    { duration: 200, easing: "ease-out", fill: "forwards" },
  );
  fade.onfinish = fade.oncancel = () => ghost.remove();
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
      // the copy leans the way it is pulled, by the pointer's horizontal speed (px per ms)
      let speed = 0;
      let tilt = 0;
      let last = { x: start.x, t: event.timeStamp };
      let leaning = 0;
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

      const lean = () => {
        leaning = requestAnimationFrame(lean);
        speed *= 0.9;
        tilt += (Math.max(-5, Math.min(5, speed * 4)) - tilt) * 0.25;
        if (ghost) ghost.style.rotate = `${tilt.toFixed(2)}deg`;
      };

      const begin = () => {
        const held = source.hasAttribute("data-held");
        source.removeAttribute("data-held");
        const box = source.getBoundingClientRect();
        offset = { x: start.x - box.left, y: start.y - box.top };
        ghost = source.cloneNode(true) as HTMLElement;
        ghost.classList.add("drag-ghost");
        ghost.style.width = `${box.width}px`;
        // it peels off right where the source is, from the point it was grabbed by
        ghost.style.transformOrigin = `${offset.x}px ${offset.y}px`;
        // translate, not transform: a transform's offset would be scaled with the lift
        ghost.style.translate = `${box.left}px ${box.top}px`;
        // a finger already lifted it while resting there
        if (held) ghost.classList.add("lifted");
        document.body.append(ghost);
        ghost.getBoundingClientRect();
        ghost.classList.add("lifted");
        if (!still.matches) leaning = requestAnimationFrame(lean);
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
        // the box makes room for the drop places; its pieces slide there
        const play = layout?.snapshot();
        setDragged(what());
        flush();
        play?.();
        source.setAttribute("data-drag-source", "");
      };

      const move = (e: PointerEvent) => {
        if (e.pointerId !== pointer) return;
        const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        // a swipe before the hold: the page scrolls, nothing is dragged
        if (!armed) return moved > HOLD_SLOP && finish(e, false);
        if (!dragged() && moved < THRESHOLD) return;
        if (!dragged()) begin();
        e.preventDefault();
        const dt = Math.max(e.timeStamp - last.t, 1);
        speed = speed * 0.7 + ((e.clientX - last.x) / dt) * 0.3;
        last = { x: e.clientX, t: e.timeStamp };
        ghost!.style.translate = `${e.clientX - offset.x}px ${e.clientY - offset.y}px`;
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
        cancelAnimationFrame(leaning);
        const what = dragged();
        source.removeAttribute("data-drag-source");
        // where the box's pieces stand mid-drag, to slide them back from or on to the drop
        const play = what ? layout?.snapshot() : undefined;
        let landing: Landing | void = undefined;
        try {
          // the handler still sees the drag as it was, then it ends, whatever the handler does
          if (what && drop && e instanceof PointerEvent) landing = handler?.(what, keyAt(e.clientX, e.clientY), e.clientX, e.clientY);
        } finally {
          setOver(undefined);
          setDragged(undefined);
        }
        if (ghost) settle(ghost, offset, source, play, landing);
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
