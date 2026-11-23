import { createSignal } from "solid-js";
import { reducedMotion } from "./motion";
import { route } from "./route";

/**
 * The page comes in with the parody's opening: credits one at a time while Theo looks into
 * the camera, turns away and walks into the crowd, the title while the crowd stands still,
 * a dip of the title as the crowd falls, and the rest of the page, with the frame going up
 * to its place, across the seam where the parody hands over to the dance: there the fall is
 * cut halfway and turns into a rise, and the page's own motion draws the eye off it. The
 * video's own frames set the pace, so a video that stalls holds the page back.
 * It plays once a session, on a visit that opens on the plain feed and with motion allowed;
 * a scroll, a key or a tap brings everything in at once.
 */

export const FPS = 24;
/** The intro is the first 512 frames of the video; the dance starts at the next one. */
export const INTRO_FRAMES = 512;
const INTRO_END = INTRO_FRAMES / FPS;

const SEEN_KEY = "t3-thoughts-intro";

let pending = route().page === "feed" && !route().q && !sessionStorage.getItem(SEEN_KEY) && !reducedMotion.matches;
if (pending) {
  sessionStorage.setItem(SEEN_KEY, "1");
  document.documentElement.classList.add("intro");
}

/** True once: for the first header of a visit that gets the intro. Later headers start at the dance. */
export function claimIntro() {
  const first = pending;
  pending = false;
  return first;
}

/**
 * The parts of the page, as classes on <html> (see styles.css), and the second of the video
 * each comes in at. Everything after the title comes in quickly around the seam at the end
 * of the intro (21.33 s), the frame's move up (0.6 s) right across it.
 */
const STAGES: [string, number][] = [
  ["at-title", 17.2],
  ["at-nav", 21],
  ["at-feed", 21.24],
];
/** From here the parts come in quickly (the "fast" class). */
const QUICK_AT = 21;

/** When each credit comes up (see Credits in Hero.tsx); each stays CREDIT_LENGTH seconds. */
const CREDIT_TIMES = [1, 3.3, 5.6, 7.9, 10.2, 12.5, 14.8];
const CREDIT_LENGTH = 2;
/** The title goes down with the falling crowd from here and is lowest at the seam. */
const BOW_START = 20.75;
const BOW_LOWEST = INTRO_END;

const [credit, setCredit] = createSignal(-1);
export { credit };

/** Runs keyframes on every element the selector finds, one after another from the first. */
function wave(selector: string, keyframes: Keyframe[], duration: number, step: number) {
  return Array.from(document.querySelectorAll<HTMLElement>(selector), (el, i) =>
    el.animate(keyframes, { duration, delay: i * step, easing: "ease-in-out", fill: "backwards" }),
  );
}

/** Down and back up, lowest at the given share of the time. */
const dip = (depth: string, lowest = 0.5): Keyframe[] => [
  { transform: "none" },
  { transform: `translateY(${depth})`, offset: lowest },
  { transform: "none" },
];

/** Plays the intro on the header's video; returns what to do when the header goes away. */
export function playIntro(video: HTMLVideoElement) {
  const root = document.documentElement;
  root.classList.add("intro");
  const inputs = ["wheel", "touchmove", "keydown", "pointerdown", "scroll"];
  const timers: number[] = [];
  let bow: Animation[] | undefined;
  let id = 0;
  let waited = 0;
  let done = false;

  const show = (name: string) => {
    if (root.classList.contains(name)) return;
    root.classList.add(name);
  };
  const names = STAGES.map(([name]) => name);
  const clear = () => root.classList.remove("intro", "fast", ...names);
  /** Brings in whatever has not come in yet: quickly for a reader who scrolls or types. */
  const finish = (fast: boolean) => {
    if (done) return;
    done = true;
    if (id) video.cancelVideoFrameCallback(id);
    clearInterval(stall);
    for (const type of inputs) window.removeEventListener(type, skip);
    window.removeEventListener("click", skip, true);
    setCredit(-1);
    if (fast) root.classList.add("fast");
    for (const name of names) show(name);
    // the intro's rules go once everything has come in
    timers.push(window.setTimeout(clear, 1600));
  };
  const skip = (event: Event) => {
    // a press skips once it is let go, at its click: by then the click has found what was under
    // it as the page was, and the nav and the bar coming in cannot take it (nor a phone's focus);
    // a press that turns into a swipe skips by its scroll
    if (event.type === "pointerdown") {
      window.addEventListener("click", skip, { capture: true, once: true });
      return;
    }
    // Space skips and stays at the top: the page it brings in is to be seen from its start
    if (event instanceof KeyboardEvent && event.key === " " && !(event.target instanceof Element && event.target.closest("input, textarea, [contenteditable], button"))) event.preventDefault();
    finish(true);
  };

  // no first frame for a few seconds of looking at the page: autoplay is off, show the page
  const stall = window.setInterval(() => {
    if (!document.hidden && ++waited >= 4) finish(false);
  }, 1000);

  const onFrame = (_now: number, frame: VideoFrameCallbackMetadata) => {
    const time = frame.mediaTime;
    clearInterval(stall);
    if (time >= INTRO_END) return finish(false);
    if (time >= QUICK_AT && !root.classList.contains("fast")) root.classList.add("fast");
    for (const [name, at] of STAGES) if (time >= at) show(name);
    setCredit(CREDIT_TIMES.findIndex((at) => time >= at && time < at + CREDIT_LENGTH));
    if (!bow && time >= BOW_START) {
      const depth = `${Math.max(6, Math.round(Math.min(innerWidth, 1920) * 0.011))}px`;
      bow = wave(".hero-text", dip(depth), (BOW_LOWEST - BOW_START) * 2000, 0);
    }
    id = video.requestVideoFrameCallback(onFrame);
  };

  if ("requestVideoFrameCallback" in video) {
    for (const type of inputs) window.addEventListener(type, skip, { passive: type !== "keydown" });
    id = video.requestVideoFrameCallback(onFrame);
  } else {
    finish(false);
  }

  return () => {
    finish(false);
    timers.forEach(clearTimeout);
    bow?.forEach((animation) => animation.cancel());
    clear();
  };
}
