/**
 * Closing sequence (storyboard frames 93–104). Agreed behaviour:
 *
 * - One trigger at the end of the map hold (~150vh) plays the whole jump on a
 *   clock (~3 s): burst + frontal tiger rushing through the camera (94–99,
 *   ~1.2 s), a beat of red (100), profile tiger galloping across and uncovering
 *   the sentence (101–104, 1 s), controls ~0.3 s later.
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
const STRIDES_PER_SEC = { frontal: 3.2, profile: 3.6 }; // a gallop, not a trot

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
  const burstEl = stage.querySelector<HTMLElement>('.burst')!;
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
  let frontalWindow: [number, number] = [0, 0];
  let profileWindow: [number, number] = [0, 0];

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

    // Storyboard frames are 1440×900. Map frame coordinates to the screen as
    // "cover" (fill the viewport, centred), so keyframes read the same on any screen.
    const k = Math.max(vw() / 1440, vh() / 900);
    const ox = (vw() - 1440 * k) / 2;
    const oy = (vh() - 900 * k) / 2;
    const fx = (x: number) => ox + x * k;
    const fy = (y: number) => oy + y * k;

    // 94–99 · burst + frontal tiger. Keyframes measured in Figma (frames 94–99).
    // Scale is interpolated in log space: constant-speed zoom, like a real approach.
    const T = { f94: 0.12, f95: 0.3, f96: 0.55, f97: 0.8, f98: 1.0, f99: 1.2 };
    // Burst (Group 273/274): top-left in frame px, scale relative to its 181×116 size
    const burstKeys = [
      { t: 0, s: 0.05, x: 625, y: 500 },
      { t: T.f94, s: 1, x: 543, y: 454 },
      { t: T.f95, s: 9.5, x: -367, y: 21 },
      { t: T.f96, s: 19.4, x: -1390, y: -454 },
      { t: T.f97, s: 35.8, x: -3197, y: -1331 },
      { t: T.f98, s: 63.4, x: -6109, y: -2650 },
    ];
    // Tiger (Group 275): position of the face (artboard 768, 474) in frame px, scale of the 1536×1024 artboard
    const tigerKeys = [
      { t: T.f94, s: 0.02, x: 716, y: 434 },
      { t: T.f95, s: 0.053, x: 716, y: 434 },
      { t: T.f96, s: 1.0, x: 694, y: 414 },
      { t: T.f97, s: 2.85, x: 715, y: 588 },
      { t: T.f98, s: 7.71, x: 715, y: 826 },
      { t: T.f99, s: 22.56, x: 715, y: 1257 },
    ];
    type Key = { t: number; s: number; x: number; y: number };
    const sample = (keys: Key[], time: number) => {
      if (time <= keys[0].t) return keys[0];
      for (let i = 1; i < keys.length; i++) {
        const a = keys[i - 1], b = keys[i];
        if (time <= b.t) {
          const u = (time - a.t) / (b.t - a.t);
          return { t: time, s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * u), x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
        }
      }
      return keys[keys.length - 1];
    };

    gsap.set(burstEl, { autoAlpha: 0 });
    gsap.set(frontalEl, { width: 1536, height: 1024, left: 0, top: 0, transformOrigin: '0 0', autoAlpha: 0 });
    const clock = { t: 0 };
    const renderFrontal = () => {
      const b = sample(burstKeys, clock.t);
      // sized, not scaled, so the vector is redrawn crisp at every size
      gsap.set(burstEl, { x: fx(b.x), y: fy(b.y), width: 181 * b.s * k, height: 116 * b.s * k });
      const g = sample(tigerKeys, clock.t);
      const sc = g.s * k;
      gsap.set(frontalEl, { x: fx(g.x) - 768 * sc, y: fy(g.y) - 474 * sc, scale: sc });
    };
    renderFrontal();

    t.to(hint, { autoAlpha: 0, duration: 0.15 }, 0)
      .to(clock, { t: T.f99, duration: T.f99, ease: 'none', onUpdate: renderFrontal }, 0)
      .to(burstEl, { autoAlpha: 1, duration: 0.06, ease: 'none' }, 0)
      .to(frontalEl, { autoAlpha: 1, duration: 0.08, ease: 'none' }, T.f94)
      // 99 → 100: the tiger passes the camera; red goes in under it, then it fades
      .fromTo(cover, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15, ease: 'none' }, T.f98)
      .to(burstEl, { autoAlpha: 0, duration: 0.01 }, T.f98 + 0.15)
      .to(frontalEl, { autoAlpha: 0, duration: 0.08, ease: 'none' }, T.f99);

    // 101–104 · profile tiger gallops left → right in 1 s, uncovers the sentence and leaves the screen
    const PROFILE_START = 1.45;
    const g = profileGeometry();
    gsap.set(profileEl, { width: g.width, height: g.height, top: g.top, left: 0, x: -g.width, autoAlpha: 1 });
    revealSentence(-Infinity);
    const haunch = 0.2; // fraction of the tiger width behind which the text is visible

    t.to(profileEl, {
      x: vw() + 40, duration: 1, ease: 'none',
      onUpdate: () => revealSentence((gsap.getProperty(profileEl, 'x') as number) + g.width * haunch),
    }, PROFILE_START)
      .set(profileEl, { autoAlpha: 0 }, PROFILE_START + 1)
      // 104 · controls ~0.3 s after the sentence is complete
      .to(controls, { autoAlpha: 1, duration: 0.3, ease: 'power1.out' }, PROFILE_START + 1.3);

    frontalWindow = [0, T.f99 + 0.1];
    profileWindow = [PROFILE_START - 0.05, PROFILE_START + 1.05];
    t.progress(progress);
  }

  // ------------------------------------------------------------- run cycles
  gsap.ticker.add((_t, dtMs) => {
    if (reduced || !tl || !tl.isActive()) return;
    const dir = tl.reversed() ? -1 : 1;
    const dt = (dtMs / 1000) * tl.timeScale() * dir;
    const t = tl.time();
    if (t >= frontalWindow[0] && t <= frontalWindow[1]) frontal!.step(dt * STRIDES_PER_SEC.frontal);
    if (t >= profileWindow[0] && t <= profileWindow[1]) profile!.step(dt * STRIDES_PER_SEC.profile);
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

  // Map entry: the stage slides up with the scroll and the map fades in over 0.5 s.
  // Going back above the map re-arms the fade for the next entry.
  gsap.set([map, hint], { autoAlpha: 0 });
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !mapEntered) {
      mapEntered = true;
      gsap.to(map, { autoAlpha: 1, duration: 0.5, ease: 'power1.out', overwrite: true, onComplete: () => showHintSoon(0) });
    } else if (!e.isIntersecting && mapEntered && state === 'map' && e.boundingClientRect.top > 0) {
      mapEntered = false;
      gsap.set([map, hint], { autoAlpha: 0, overwrite: true });
    }
  }, { threshold: 0.12 });
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
