/**
 * Closing sequence (frames 93–101). Agreed behaviour:
 *
 * - One trigger at the end of the map hold (~150vh) plays the whole jump on a
 *   clock (~6 s): frontal tiger approaches camera and fades (~3 s), ~1 s red,
 *   profile tiger crosses and uncovers the sentence (~2 s), controls ~0.5 s later.
 * - Scroll does not scrub frames. The stage is sticky; fast scrolling never
 *   skips or speeds up the animation, it always completes.
 * - Scrolling back up past the trigger rewinds it like a video (tigers run
 *   backwards) at 2× speed, from wherever it is. A ~90 px hysteresis band keeps
 *   trackpad jitter from flipping direction.
 * - Crossing the trigger downwards again always replays the full jump.
 * - prefers-reduced-motion: fades only, no moving tigers.
 */
import { gsap } from 'gsap';
import { createFrontalTiger, createProfileTiger, type Tiger } from './tigers';

const MAP_HOLD_VH = 1.5;   // scroll length of the explorable map before the trigger
const HYSTERESIS_PX = 90;  // upward scroll needed to start rewinding
const REWIND_SPEED = 2;
const STRIDES_PER_SEC = { frontal: 2.1, profile: 2.3 };

type State = 'map' | 'playing' | 'done' | 'rewinding';

export interface ClosingApi {
  /** Reader interacted with the map: hide the hint for a while */
  notifyInteraction(): void;
}

export function createClosing(section: HTMLElement): ClosingApi {
  const stage = section.querySelector<HTMLElement>('.stage')!;
  const map = stage.querySelector<HTMLElement>('.map')!;
  const hint = stage.querySelector<HTMLElement>('.hint')!;
  const cover = stage.querySelector<HTMLElement>('.red-cover')!;
  const frontalEl = stage.querySelector<HTMLElement>('.tiger--frontal')!;
  const profileEl = stage.querySelector<HTMLElement>('.tiger--profile')!;
  const sentence = stage.querySelector<HTMLElement>('.final__sentence')!;
  const controls = stage.querySelectorAll<HTMLElement>('.final__controls, .final__menu-slot');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frontal: Tiger | null = reduced ? null : createFrontalTiger(frontalEl);
  const profile: Tiger | null = reduced ? null : createProfileTiger(profileEl);

  let state: State = 'map';
  let trigger = 0;
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;

  // ---------------------------------------------------------------- layout
  /** Sentence reveal: visible only to the left of the tiger's haunch. */
  function revealSentence(edgeX: number) {
    const r = sentence.getBoundingClientRect();
    const hidden = Math.min(r.width, Math.max(0, r.right - edgeX));
    sentence.style.clipPath = `inset(-10% ${hidden}px -10% -2%)`;
  }

  function profileGeometry() {
    const portrait = vh() > vw();
    const width = portrait ? vw() * 1.7 : vw() * 1.23; // storyboard: 1774 px tiger on a 1440 px frame
    const height = width * (887 / 1774);
    // stage-relative: the stage may not be pinned yet when this runs
    const s = sentence.getBoundingClientRect();
    const st = stage.getBoundingClientRect();
    const top = s.top - st.top + s.height / 2 - height * 0.5;
    return { width, height, top };
  }

  // ------------------------------------------------------------- timeline
  let tl: gsap.core.Timeline | undefined;

  function build() {
    const progress = tl ? tl.progress() : 0;
    tl?.kill();
    gsap.set(controls, { autoAlpha: 0 });
    const t = (tl = gsap.timeline({
      paused: true,
      onComplete: () => { state = 'done'; },
      onReverseComplete: () => { state = 'map'; showHintSoon(); },
    }));

    if (reduced) {
      gsap.set(sentence, { clipPath: 'none', opacity: 0 }); // opacity only: stays readable for screen readers
      t.to(hint, { autoAlpha: 0, duration: 0.2 }, 0)
        .fromTo(cover, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'none' }, 0)
        .to(sentence, { opacity: 1, duration: 0.5, ease: 'none' }, 0.5)
        .to(controls, { autoAlpha: 1, duration: 0.4 }, 1.0);
      t.progress(progress);
      return;
    }

    // 94–97 · frontal tiger runs towards camera from the sea east of China, then fades
    const base = Math.max(vw(), vh() * 1.5); // tiger artboard width before scaling
    gsap.set(frontalEl, {
      width: base, height: base * (1024 / 1536),
      left: '50%', top: '50%', xPercent: -50, yPercent: -46, // face (y ≈ 46 %) at the centre
      transformOrigin: '50% 46%', autoAlpha: 0,
    });
    const startScale = (vw() > vh() ? 270 : 200) / base; // ~270 px wide, as in frame 94
    const endScale = 2.6; // face fills the screen (frame 97)
    // Running towards camera at constant speed: on-screen size ∝ 1 / distance,
    // so scale grows slowly at first and very fast at the end (true perspective).
    const approach = { p: 0 };
    const k = 1 - startScale / endScale;
    const placeFrontal = () => {
      const scale = startScale / (1 - approach.p * k);
      const q = (scale - startScale) / (endScale - startScale); // 0 → 1 on screen
      gsap.set(frontalEl, { scale, x: vw() * 0.04 * (1 - q), y: -vh() * 0.04 + vh() * 0.2 * q });
    };
    placeFrontal();

    t.to(hint, { autoAlpha: 0, duration: 0.2 }, 0)
      .to(approach, { p: 1, duration: 2.6, ease: 'none', onUpdate: placeFrontal }, 0)
      .to(frontalEl, { autoAlpha: 1, duration: 0.3, ease: 'none' }, 0)
      // camera shake as it gets close
      .to(map, {
        keyframes: { x: [0, -6, 7, -8, 6, -4, 0], y: [0, 4, -5, 6, -4, 3, 0] },
        duration: 0.9, ease: 'none',
      }, 1.5)
      // red goes in behind the (now huge) tiger, then the tiger fades: ~1 s of plain red follows
      .fromTo(cover, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'none' }, 2.15)
      .to(frontalEl, { autoAlpha: 0, duration: 0.6, ease: 'power1.in' }, 2.4)

    // 98–100 · profile tiger crosses left → right in 2 s and uncovers the sentence
    const g = profileGeometry();
    gsap.set(profileEl, { width: g.width, height: g.height, top: g.top, left: 0, x: -g.width, autoAlpha: 1 });
    revealSentence(-Infinity);
    const haunch = 0.2; // fraction of the tiger width behind which the text is visible

    t.to(profileEl, {
      x: vw(), duration: 2, ease: 'none',
      onUpdate: () => revealSentence((gsap.getProperty(profileEl, 'x') as number) + g.width * haunch),
    }, 4.0)
      // 101 · controls ~0.5 s after the sentence is complete
      .to(controls, { autoAlpha: 1, duration: 0.4, ease: 'power1.out' }, 6.5);

    t.progress(progress);
  }

  // ------------------------------------------------------------- run cycles
  gsap.ticker.add((_t, dtMs) => {
    if (reduced || !tl || !tl.isActive()) return;
    const dir = tl.reversed() ? -1 : 1;
    const dt = (dtMs / 1000) * tl.timeScale() * dir;
    const t = tl.time();
    if (t < 3.05) frontal!.step(dt * STRIDES_PER_SEC.frontal);
    if (t > 3.95) profile!.step(dt * STRIDES_PER_SEC.profile);
  });

  // ------------------------------------------------------------- trigger
  function measure() {
    trigger = section.offsetTop + vh() * MAP_HOLD_VH;
  }

  function play() {
    state = 'playing';
    tl!.timeScale(1).play();
  }

  function rewind() {
    state = 'rewinding';
    tl!.timeScale(REWIND_SPEED).reverse();
  }

  function onScroll() {
    const y = window.scrollY;
    if (y >= trigger && (state === 'map' || state === 'rewinding')) play();
    else if (y < trigger - HYSTERESIS_PX && (state === 'playing' || state === 'done')) rewind();
  }

  // ------------------------------------------------------------- hint
  let hintTimer = 0;
  let mapEntered = false;
  function showHintSoon(delay = 2500) {
    clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => {
      const legendOpen = stage.querySelector('.map-legend.is-open');
      if (state === 'map' && mapEntered && !legendOpen) gsap.to(hint, { autoAlpha: 1, duration: 0.4, overwrite: true });
    }, delay);
  }

  // Map entry (placeholder: the transition from frame 92 is out of scope for this test)
  gsap.set([map, hint], { autoAlpha: 0 });
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !mapEntered) {
      mapEntered = true;
      gsap.to(map, { autoAlpha: 1, duration: reduced ? 0.3 : 0.8, ease: 'power1.out', onComplete: () => showHintSoon(0) });
    }
  }, { threshold: 0.6 });
  io.observe(stage);

  // ------------------------------------------------------------- init
  build();
  measure();
  // Landing already past the trigger (reload at the bottom): show the end state, no replay
  if (window.scrollY >= trigger) {
    mapEntered = true;
    gsap.set(map, { autoAlpha: 1 });
    tl!.progress(1);
    state = 'done';
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { build(); measure(); onScroll(); }, 150);
  });

  // Controls (placeholders until the 101 UI is designed)
  stage.querySelector('[data-action="top"]')!.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));
  stage.querySelector('[data-action="share"]')!.addEventListener('click', async () => {
    const data = { title: document.title, url: location.href };
    if (navigator.share) await navigator.share(data).catch(() => {});
    else await navigator.clipboard?.writeText(location.href);
  });
  stage.querySelector('[data-action="credits"]')!.addEventListener('click', (e) => {
    (e.currentTarget as HTMLElement).textContent = 'Credits (to be designed)';
  });

  return {
    notifyInteraction() {
      if (state !== 'map') return;
      gsap.to(hint, { autoAlpha: 0, duration: 0.2, overwrite: true });
      showHintSoon();
    },
  };
}
