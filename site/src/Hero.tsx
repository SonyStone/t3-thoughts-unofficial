import type { JSX } from "@solidjs/web";
import { createSignal, onSettled, Show } from "solid-js";
import { reducedMotion } from "./motion";
import { t } from "./i18n";
import { claimIntro, credit, FPS, INTRO_FRAMES, playIntro } from "./intro";
import loopWebmWide from "../../assets/header/loop-grok-1920.webm?url";
import loopMp4Wide from "../../assets/header/loop-grok-1920.mp4?url";
import loopWebm from "../../assets/header/loop-grok-1280.webm?url";
import loopMp4 from "../../assets/header/loop-grok-1280.mp4?url";
import loopWebmMobile from "../../assets/header/loop-grok-960.webm?url";
import loopMp4Mobile from "../../assets/header/loop-grok-960.mp4?url";
import introWebpWide from "../../assets/header/poster-1920.webp?url";
import introJpgWide from "../../assets/header/poster-1920.jpg?url";
import introWebp from "../../assets/header/poster-1280.webp?url";
import introJpg from "../../assets/header/poster-1280.jpg?url";
import introWebpMobile from "../../assets/header/poster-960.webp?url";
import introJpgMobile from "../../assets/header/poster-960.jpg?url";
import danceWebpWide from "../../assets/header/poster-loop-1920.webp?url";
import danceJpgWide from "../../assets/header/poster-loop-1920.jpg?url";
import danceWebp from "../../assets/header/poster-loop-1280.webp?url";
import danceJpg from "../../assets/header/poster-loop-1280.jpg?url";
import danceWebpMobile from "../../assets/header/poster-loop-960.webp?url";
import danceJpgMobile from "../../assets/header/poster-loop-960.jpg?url";
import workos from "../../assets/header/credits/workos.svg?url";
import blacksmithIcon from "../../assets/header/credits/blacksmith-icon.svg?url";
import blacksmith from "../../assets/header/credits/blacksmith.svg?url";
import browserbase from "../../assets/header/credits/browserbase.svg?url";
import coderabbitIcon from "../../assets/header/credits/coderabbit-icon.svg?url";
import coderabbit from "../../assets/header/credits/coderabbit.svg?url";

/** Same breakpoint as the phone header in styles.css: phones get the 960 files, whatever their pixel density. */
const MOBILE = "(max-width: 700px)";
/**
 * Where the 1920 files pay for their weight: the frame (the window's width, up to 1920) is
 * wider than about 1500 device pixels. A video has no srcset, so this is said in pixels and
 * density, and the posters use the same query: a poster sharper than its video would show
 * the swap to the first frame.
 */
const WIDE = "(min-width: 1500px), (min-width: 1000px) and (min-resolution: 1.5dppx)";

/**
 * After the intro the video has five takes of one dance that start and end in the crowd's
 * bow, then a single frame of the bow to jump away from.
 */
const TAKES = 5;
const TAKE_FRAMES = 144;
/** The takes play this much faster than the intro, closer to the pace the intro ends at. */
const TAKE_RATE = 1;

/**
 * Plays the takes in random order after the intro. When the file moves on to a take other
 * than the chosen one, the video jumps to the chosen one while still on the first frame:
 * the takes' first frames are the same bow, and the frame shown before a jump is cut short,
 * so the only frame lost is one that looks like its replacement. The last frame of the file
 * counts as the first frame of one more take, so the end leads into a take, not the intro.
 * The takes play at TAKE_RATE, the intro at its own speed.
 * Without requestVideoFrameCallback, or when that frame slips by unseen, the file plays on
 * in its own order.
 */
function shuffleTakes(video: HTMLVideoElement) {
  if (!("requestVideoFrameCallback" in video)) return;
  let take = -1;
  let next = Math.floor(Math.random() * TAKES);
  let id = 0;
  const onFrame = (_now: number, frame: VideoFrameCallbackMetadata) => {
    const index = Math.round(frame.mediaTime * FPS) - INTRO_FRAMES;
    const current = Math.floor(index / TAKE_FRAMES);
    const rate = index >= 0 ? TAKE_RATE : 1;
    if (video.playbackRate !== rate) video.playbackRate = rate;
    if (index >= 0 && current !== take) {
      if (current !== next && index % TAKE_FRAMES === 0) {
        if (!video.seeking) video.currentTime = (INTRO_FRAMES + next * TAKE_FRAMES) / FPS;
      } else {
        take = current;
        // any take but this one
        next = (take + 1 + Math.floor(Math.random() * (TAKES - 1))) % TAKES;
      }
    }
    id = video.requestVideoFrameCallback(onFrame);
  };
  id = video.requestVideoFrameCallback(onFrame);
  return () => video.cancelVideoFrameCallback(id);
}

/** Where a credit stands in the frame: top, middle or low; left or right. */
type Place = "tl" | "tr" | "ml" | "mr" | "bl" | "br";

function Credit(props: { index: number; place: Place; children: JSX.Element }) {
  return <div class={{ credit: true, [props.place]: true, on: credit() === props.index }}>{props.children}</div>;
}

/**
 * Credits before the title, one short line at a time and each in another part of the frame:
 * Theo, his two companies, and the sponsors from his X header.
 */
function Credits() {
  return (
    <div class="credits" aria-hidden="true">
      <Credit index={0} place="mr">
        <small>{t().credits.starring}</small>
        <strong>Theo Browne</strong>
      </Credit>
      <Credit index={1} place="tl">
        <small>{t().credits.ceo}</small>
        <strong>T3 Code</strong>
      </Credit>
      <Credit index={2} place="br">
        <small>{t().credits.and}</small>
        <strong>T3 Chat</strong>
      </Credit>
      <Credit index={3} place="tr">
        <small>{t().credits.sponsors}</small>
        <img class="logo" src={workos} alt="" style={{ height: "1em" }} />
      </Credit>
      <Credit index={4} place="bl">
        <span class="logo">
          <img src={blacksmithIcon} alt="" style={{ height: "0.8em" }} />
          <img src={blacksmith} alt="" style={{ height: "0.55em" }} />
        </span>
      </Credit>
      <Credit index={5} place="mr">
        <img class="logo" src={browserbase} alt="" style={{ height: "1.6em" }} />
      </Credit>
      <Credit index={6} place="ml">
        <span class="logo">
          <img src={coderabbitIcon} alt="" style={{ height: "1em" }} />
          <img src={coderabbit} alt="" style={{ height: "0.8em" }} />
        </span>
      </Credit>
    </div>
  );
}

/**
 * The video in a frame of fixed proportions: the title is placed and sized in the frame's
 * own units, so it keeps its place beside Theo at any window width. The first header of a
 * visit may play the intro (see intro.ts); any other starts at the dance.
 */
export default function Hero() {
  const intro = claimIntro();
  const [credits, setCredits] = createSignal(intro);
  let video: HTMLVideoElement | undefined;
  let stopIntro: (() => void) | undefined;
  // the replay waits two frames: left in between (another page opened), it does not start
  let frame = 0;
  onSettled(() => {
    if (!video) return;
    const el = video;
    const stopTakes = shuffleTakes(el);
    if (intro && !reducedMotion.matches) stopIntro = playIntro(el);
    // scrolled out of the window, the video stops, so it is not decoded for nobody
    let visible = false;
    const updatePlayback = () => {
      if (reducedMotion.matches) {
        cancelAnimationFrame(frame);
        stopIntro?.();
        stopIntro = undefined;
        setCredits(false);
        document.documentElement.classList.remove("intro");
      }
      if (!visible || reducedMotion.matches) el.pause();
      else if (el.paused) el.play().catch(() => {});
    };
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updatePlayback();
    });
    reducedMotion.addEventListener("change", updatePlayback);
    seen.observe(el);
    return () => {
      reducedMotion.removeEventListener("change", updatePlayback);
      seen.disconnect();
      stopTakes?.();
      stopIntro?.();
      cancelAnimationFrame(frame);
    };
  });
  /** The hidden button over Theo: the intro again, from the top of the page. */
  const replay = () => {
    const el = video;
    if (!el) return;
    stopIntro?.();
    scrollTo({ top: 0, behavior: "instant" });
    if (reducedMotion.matches) return;
    setCredits(true);
    // after the scroll's own event, which the intro would take for the reader skipping it
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        el.currentTime = 0;
        void el.play();
        stopIntro = playIntro(el);
      });
    });
  };
  const startAtDance = (el: HTMLVideoElement) => {
    video = el;
    if (intro) return;
    const toDance = () => el.currentTime < INTRO_FRAMES / FPS && (el.currentTime = INTRO_FRAMES / FPS);
    el.addEventListener("loadedmetadata", toDance, { once: true });
  };
  return (
    <div class="hero">
      <div class="hero-frame">
        {/* The first frame the video will show, until it has one of its own. */}
        <picture>
          <source media={MOBILE} srcset={credits() ? introWebpMobile : danceWebpMobile} type="image/webp" />
          <source media={MOBILE} srcset={credits() ? introJpgMobile : danceJpgMobile} />
          <source media={WIDE} srcset={credits() ? introWebpWide : danceWebpWide} type="image/webp" />
          <source media={WIDE} srcset={credits() ? introJpgWide : danceJpgWide} />
          <source srcset={credits() ? introWebp : danceWebp} type="image/webp" />
          <img class="hero-media" src={credits() ? introJpg : danceJpg} alt="" fetchpriority="high" />
        </picture>
        {/* the first source that matches wins; a browser that ignores media takes the first, the light one */}
        <video class="hero-media" ref={startAtDance} muted loop playsinline>
          <source media={MOBILE} src={loopWebmMobile} type="video/webm" />
          <source media={MOBILE} src={loopMp4Mobile} type="video/mp4" />
          <source media={WIDE} src={loopWebmWide} type="video/webm" />
          <source media={WIDE} src={loopMp4Wide} type="video/mp4" />
          <source src={loopWebm} type="video/webm" />
          <source src={loopMp4} type="video/mp4" />
        </video>
        <div class="hero-text">
          <h1>T3 Thoughts</h1>
          <p>{t().tagline}</p>
        </div>
        <Show when={credits()}>
          <Credits />
        </Show>
        {/* a press does not leave the focus on it: Space and Enter go on to the page (and skip the intro), not replay it again */}
        <button
          class="replay"
          type="button"
          tabindex="-1"
          aria-label={t().replayIntro}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            // whatever had the focus (the search, a menu button) lets it go too: the intro has the page
            (document.activeElement as HTMLElement | null)?.blur();
            replay();
          }}
        />
      </div>
    </div>
  );
}
