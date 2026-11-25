/**
 * Closing sequence (storyboard frames 93–104). Agreed behaviour:
 *
 * - One trigger at the end of the map hold (~150vh) plays the whole jump on a
 *   clock (~5.4 s): burst grows centred on the page and holds completely still
 *   1 s while the tiger appears in its red core; the tiger pounces at the reader
 *   while everything shakes (94–99, ~2.3 s); 0.5 s of red (100); the profile
 *   tiger leaps in on a parabola, lands in the centre and leaps out, uncovering
 *   the sentence (101–104, ~2.3 s); controls ~0.3 s later.
 * - Comic timing (reference video): 12 drawings per second, boiling shapes,
 *   debris popping out of the burst, hard cuts.
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

const MAP_IN_VH = 0.9;     // the chapter text has scrolled out (92_C): the map fades in
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
  const fxEl = stage.querySelector<HTMLElement>('.fx')!;
  const profileEl = stage.querySelector<HTMLElement>('.tiger--profile')!;
  const sentence = stage.querySelector<HTMLElement>('.final__sentence')!;
  const controls = stage.querySelectorAll<HTMLElement>('.final__controls');
  const chapterNumber = stage.querySelector<HTMLElement>('.chapter__number')!;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frontal: Tiger | null = reduced ? null : createFrontalTiger(frontalEl);
  const profile: Tiger | null = reduced ? null : createProfileTiger(profileEl);

  let state: State = 'map';
  let trigger = 0;
  let mapIn = 0;
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
    // smaller than the storyboard (1774 px on 1440) so it reads as landing in the centre of the screen
    const width = portrait ? vw() * 1.3 : vw() * 0.92;
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
    // Rhythm agreed after the first comic test:
    // burst grows (0–0.6 s) → holds still 1 s while the tiger appears inside it →
    // burst cut, tiger rushes to camera over red (→ 2.3 s) → 0.5 s of red →
    // profile tiger crosses in 1.6 s.
    const T = { hold: 0.6, tigerIn: 0.7, burstOut: 1.6, f98: 1.85, f99: 2.1, out: 2.3 };
    // Burst: top-left in frame px, scale relative to its 181×116 size (frame 94 = scale 1)
    const B = { f94: 0.25 };
    // Burst centred on the page: its red core (≈102, 50 in its 181×116 drawing) stays at frame (720, 450)
    const CORE = { x: 102, y: 50 };
    const at = (t: number, sc: number) => ({ t, s: sc, x: 720 - CORE.x * sc, y: 450 - CORE.y * sc });
    const burstKeys = [at(0, 0.04), at(B.f94, 1), at(T.hold, 6.5), at(T.burstOut, 6.5)];
    // Tiger: position of the face (artboard 768, 474) in frame px, scale of the 1536×1024 artboard
    const tigerKeys = [
      { t: T.tigerIn, s: 0.04, x: 720, y: 440 },  // born in the burst's red core
      { t: T.burstOut, s: 0.6, x: 720, y: 440 },  // grows inside the still burst
      { t: T.f98, s: 2.85, x: 718, y: 560 },      // then pounces at the reader
      { t: T.f99, s: 7.71, x: 716, y: 800 },
      { t: T.out, s: 22.56, x: 715, y: 1257 },
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

    // Comic timing, as in the reference video: drawings held for 2 frames at
    // 24 fps (12 drawings per second), shapes that "boil" (redrawn slightly
    // differently every drawing), hard cuts instead of fades.
    const FPS = 12;
    const held = (time: number) => Math.floor(time * FPS + 1e-6) / FPS;
    const BOIL = [
      { r: 0, sx: 1, sy: 1 }, { r: -2.5, sx: 1.04, sy: 0.97 }, { r: 1.8, sx: 0.97, sy: 1.03 },
      { r: -1.2, sx: 1.02, sy: 1.01 }, { r: 2.6, sx: 0.98, sy: 0.96 }, { r: -2, sx: 1.03, sy: 1.02 },
    ];
    const burstSvg = burstEl.querySelector('svg')!;
    const SHAKE = [[0.6, -0.8], [-1, 0.4], [0.9, 0.9], [-0.5, -1], [1, -0.2], [-0.8, 0.7]];

    // Debris that pops out of the burst: stars, shards and dots (frame-space origin = burst in 94)
    fxEl.innerHTML = '';
    const ORIGIN = { x: 720, y: 450 };
    const debris = Array.from({ length: 16 }, (_, i) => {
      const kind = i % 3 === 0 ? 'dot' : i % 3 === 1 ? 'star' : 'shard';
      const node = document.createElement('span');
      node.className = `fx__${kind}`;
      fxEl.append(node);
      const angle = (i / 16) * Math.PI * 2 + (i % 2 ? 0.25 : -0.15);
      return { node, angle, delay: (3 + (i * 7) % 5) / FPS, speed: 700 + ((i * 37) % 9) * 160, size: 16 + ((i * 13) % 4) * 8, spin: (i % 2 ? 1 : -1) * (90 + (i % 4) * 40) };
    });

    gsap.set(burstEl, { autoAlpha: 0 });
    gsap.set(frontalEl, { width: 1536, height: 1024, left: 0, top: 0, transformOrigin: '0 0', autoAlpha: 0 });
    const clock = { t: 0 };
    const renderFrontal = () => {
      const tq = held(clock.t);
      const n = Math.round(tq * FPS);
      // the burst boils only while it grows; once it reaches its size it is completely still
      const boil = tq < T.hold ? BOIL[n % BOIL.length] : BOIL[0];
      const b = sample(burstKeys, tq);
      // sized, not scaled, so the vector is redrawn crisp at every size
      gsap.set(burstEl, { x: fx(b.x), y: fy(b.y), width: 181 * b.s * k, height: 116 * b.s * k });
      gsap.set(burstSvg, { rotation: boil.r, scaleX: boil.sx, scaleY: boil.sy, transformOrigin: `${(CORE.x / 181) * 100}% ${(CORE.y / 116) * 100}%` });
      for (const d of debris) {
        const age = tq - d.delay;
        if (age < 0 || tq >= T.burstOut) { d.node.style.visibility = 'hidden'; continue; }
        const r = d.speed * Math.min(age, 0.5) * (1 + Math.min(age, 0.5) * 2); // flies out, then settles around the still burst
        const size = d.size * (1 + Math.min(age, 0.5) * 4) * k;
        d.node.style.visibility = 'visible';
        gsap.set(d.node, {
          x: fx(ORIGIN.x + Math.cos(d.angle) * r) - size / 2, y: fy(ORIGIN.y + Math.sin(d.angle) * r) - size / 2,
          width: size, height: size, rotation: d.spin * Math.min(age, 0.5),
        });
      }
      const g = sample(tigerKeys, tq);
      const sc = g.s * k;
      gsap.set(frontalEl, { x: fx(g.x) - 768 * sc, y: fy(g.y) - 474 * sc, scale: sc, transformOrigin: '0 0' });
      // The pounce: everything shakes while the tiger comes at the reader, harder as it gets closer
      if (tq >= T.burstOut && tq < T.out) {
        const p = (tq - T.burstOut) / (T.out - T.burstOut);
        const amp = (6 + 22 * p) * k;
        const j = SHAKE[n % SHAKE.length];
        gsap.set(stage, { x: j[0] * amp, y: j[1] * amp });
      } else {
        gsap.set(stage, { x: 0, y: 0 });
      }
    };
    renderFrontal();

    t.to(hint, { autoAlpha: 0, duration: 0.15 }, 0)
      .to(clock, { t: T.out, duration: T.out, ease: 'none', onUpdate: renderFrontal }, 0)
      .set(burstEl, { autoAlpha: 1 }, 0)
      .set(fxEl, { autoAlpha: 1 }, 0)
      .set(frontalEl, { autoAlpha: 1 }, T.tigerIn)
      // hard cut: the burst goes, the tiger keeps coming over plain red
      .set(cover, { autoAlpha: 1 }, T.burstOut)
      .set([burstEl, fxEl], { autoAlpha: 0 }, T.burstOut)
      .set(frontalEl, { autoAlpha: 0 }, T.out);

    // 100 · ~0.5 s of red, then 101–104 · the profile tiger leaps in on a parabola,
    // lands in the centre, and leaps out on another one. No leg cycle: the whole
    // body tilts with the arc (nose up while rising, down while falling).
    const PROFILE_START = T.out + 0.5;
    const JUMP = 0.95;   // each leap
    const LAND = 0.4;    // still in the centre
    const PROFILE_DUR = JUMP * 2 + LAND;
    const g = profileGeometry();
    gsap.set(profileEl, { width: g.width, height: g.height, top: g.top, left: 0, x: -g.width, y: 0, rotation: 0, autoAlpha: 1, transformOrigin: '50% 60%' });
    revealSentence(-Infinity);
    const haunch = 0.2; // fraction of the tiger width behind which the text is visible
    const centreX = (vw() - g.width) / 2;
    const leaps = [
      { x0: -g.width, y0: vh() * 0.18, x1: centreX, y1: 0, h: vh() * 0.22 },
      { x0: centreX, y0: 0, x1: vw() + 40, y1: vh() * 0.12, h: vh() * 0.22 },
    ];
    const leapAt = (l: typeof leaps[number], u: number) => ({
      x: l.x0 + (l.x1 - l.x0) * u,
      y: l.y0 + (l.y1 - l.y0) * u - 4 * l.h * u * (1 - u),
    });
    const jumpClock = { t: 0 };
    const renderProfile = () => {
      const tq = held(jumpClock.t);
      let pos: { x: number; y: number }; let tilt = 0;
      if (tq < JUMP) {
        const u = tq / JUMP, l = leaps[0];
        pos = leapAt(l, u);
        const next = leapAt(l, Math.min(1, u + 0.02));
        tilt = Math.max(-16, Math.min(16, (Math.atan2(next.y - pos.y, next.x - pos.x) * 180) / Math.PI));
      } else if (tq < JUMP + LAND) {
        pos = { x: centreX, y: 0 };
      } else {
        const u = Math.min(1, (tq - JUMP - LAND) / JUMP), l = leaps[1];
        pos = leapAt(l, u);
        const next = leapAt(l, Math.min(1, u + 0.02));
        tilt = Math.max(-16, Math.min(16, (Math.atan2(next.y - pos.y, next.x - pos.x) * 180) / Math.PI));
      }
      gsap.set(profileEl, { x: pos.x, y: pos.y, rotation: tilt });
      revealSentence(pos.x + g.width * haunch);
    };

    t.to(jumpClock, { t: PROFILE_DUR, duration: PROFILE_DUR, ease: 'none', onUpdate: renderProfile }, PROFILE_START)
      .set(profileEl, { autoAlpha: 0 }, PROFILE_START + PROFILE_DUR)
      // 104 · controls ~0.3 s after the sentence is complete
      .to(controls, { autoAlpha: 1, duration: 0.3, ease: 'power1.out' }, PROFILE_START + PROFILE_DUR + 0.3);

    // No run cycles: both tigers keep their drawn pose (frontal pounces, profile leaps)
    frontalWindow = [-1, -1];
    profileWindow = [-1, -1];
    t.progress(progress);
  }

  // ------------------------------------------------------------- run cycles
  let cycleAcc = 0;
  gsap.ticker.add((_t, dtMs) => {
    if (reduced || !tl || !tl.isActive()) return;
    const dir = tl.reversed() ? -1 : 1;
    const dt = (dtMs / 1000) * tl.timeScale() * dir;
    const t = tl.time();
    // Pose changes only once per drawing (12 per second), like the burst
    cycleAcc += dt;
    if (Math.abs(cycleAcc) < 1 / 12) return;
    if (t >= frontalWindow[0] && t <= frontalWindow[1]) frontal!.step(cycleAcc * STRIDES_PER_SEC.frontal);
    if (t >= profileWindow[0] && t <= profileWindow[1]) profile!.step(cycleAcc * STRIDES_PER_SEC.profile);
    cycleAcc = 0;
  });

  // ------------------------------------------------------------- trigger
  function measure() {
    mapIn = section.offsetTop + vh() * MAP_IN_VH;
    trigger = mapIn + vh() * MAP_HOLD_VH;
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
    updateMapEntry();
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

  // 92 → 93: the chapter text scrolls out over the pinned red stage (92_B, 92_C);
  // then the map fades in over 0.5 s and "07." fades out (92_D → 93). Scrolling
  // back above that point fades the map out again.
  gsap.set([map, hint], { autoAlpha: 0 });
  function updateMapEntry() {
    const y = window.scrollY;
    if (!mapEntered && y >= mapIn) {
      mapEntered = true;
      gsap.to(map, { autoAlpha: 1, duration: 0.5, ease: 'power1.out', overwrite: true, onComplete: () => showHintSoon(0) });
      gsap.to(chapterNumber, { autoAlpha: 0, duration: 0.5, overwrite: true });
    } else if (mapEntered && state === 'map' && y < mapIn - HYSTERESIS_PX) {
      mapEntered = false;
      gsap.to([map, hint], { autoAlpha: 0, duration: 0.3, overwrite: true });
      gsap.to(chapterNumber, { autoAlpha: 1, duration: 0.3, overwrite: true });
    }
  }

  // ------------------------------------------------------------- init
  build();
  measure();
  // Landing already past the trigger (reload at the bottom): show the end state, no replay
  if (window.scrollY >= trigger) {
    mapEntered = true;
    gsap.set(map, { autoAlpha: 1 });
    gsap.set(chapterNumber, { autoAlpha: 0 });
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
  // 104 · Play again replays the jump from the burst; Share uses the native sheet or copies the link
  stage.querySelector('[data-action="replay"]')!.addEventListener('click', () => {
    if (!tl) return;
    state = 'playing';
    tl.timeScale(1).progress(0).play();
  });
  stage.querySelector('[data-action="share"]')!.addEventListener('click', async () => {
    const data = { title: 'Tiger Trafficking', url: location.href };
    if (navigator.share) await navigator.share(data).catch(() => {});
    else await navigator.clipboard?.writeText(location.href);
  });

  return {
    notifyInteraction() {
      if (state !== 'map') return;
      gsap.to(hint, { autoAlpha: 0, duration: 0.2, overwrite: true });
      showHintSoon();
    },
  };
}
