/**
 * Stepped-scene engine shared by every scene.
 *
 * A scene has a sticky stage and a paused GSAP timeline with labels. Scroll
 * thresholds (in vh, relative to the section top) move the timeline from one
 * label to the next: ANIMATE on a clock, then HOLD until the next threshold.
 * Going back plays the steps backwards, or cuts (seek) for heavy animations.
 */
import { gsap } from 'gsap';

export interface Stepped {
  section: HTMLElement;
  tl: gsap.core.Timeline;
  labels: string[];
  /** Crossing the i-th threshold goes to labels[i + 1] */
  at: number[];
  index: number;
  tween?: gsap.core.Tween;
  /** Going back from this label index or later cuts instead of playing backwards */
  cutBackFrom?: number;
  started?: boolean;
  /** Called with the label index the scene is heading to */
  onStep?: (index: number) => void;
  /** Thresholds (indexes into `at`) that are exits: the page does not rest there, it carries on */
  passAt?: number[];
}

const scenes: Stepped[] = [];
const vh = () => window.innerHeight;

// ------------------------------------------------------------------ busy (step model)
// While a step's animation plays, the stepper ignores new gestures.
let busyUntil = 0;
export function markBusy(seconds: number) {
  busyUntil = Math.max(busyUntil, performance.now() + seconds * 1000);
}
export const isBusy = () => performance.now() < busyUntil;

// ------------------------------------------------------------------ stops
// Scroll positions where the page rests: one per scene step, plus the ones other
// modules register (the closing, plain sections).
export interface Stop { y: number; pass: boolean }
const extraStops: Array<() => number[]> = [];
export function registerStops(fn: () => number[]) { extraStops.push(fn); }
/**
 * Resting points, in order. A `pass` stop is an exit (a text leaving, a burst):
 * the stepper goes there, lets the animation play, then carries on by itself.
 */
export function getStops(): Stop[] {
  const out = new Map<number, boolean>();
  const max = document.documentElement.scrollHeight - vh();
  const add = (v: number, pass: boolean) => {
    const y = Math.max(0, Math.min(max, Math.round(v)));
    out.set(y, (out.get(y) ?? true) && pass); // a real stop wins over a pass at the same place
  };
  for (const s of scenes) {
    const top = s.section.offsetTop;
    add(top, false);
    s.at.forEach((a, i) => { if (a >= 0) add(top + a * vh() + 2, s.passAt?.includes(i) ?? false); });
  }
  for (const f of extraStops) for (const v of f()) add(v, false);
  return [...out].map(([y, pass]) => ({ y, pass })).sort((a, b) => a.y - b.y);
}

export function registerScene(s: Omit<Stepped, 'index'>) {
  // same object (not a copy): scenes may expose `tl` through a getter and rebuild it on resize
  const scene = s as Stepped;
  scene.index = 0;
  scenes.push(scene);
}

export function updateScenes() {
  const y = window.scrollY;
  for (const s of scenes) {
    const top = s.section.offsetTop;
    let index = 0;
    for (const a of s.at) if (y >= top + a * vh()) index++;
    if (index === s.index && s.started) continue;
    const back = index < s.index;
    const cut = (back && s.cutBackFrom !== undefined && s.index >= s.cutBackFrom)
      || (!s.started && index >= 2)        // landing deep in the page (reload, menu link): no replay of earlier steps
      || index - s.index > 1;              // jumping over several steps at once (menu link, fast scroll)
    s.started = true;
    s.index = index;
    s.onStep?.(index);
    s.tween?.kill();
    if (cut) {
      s.tl.pause().seek(s.labels[index]);
      redraw(s.tl);
    }
    else {
      s.tween = s.tl.tweenTo(s.labels[index], { ease: 'none' });
      markBusy(s.tween.duration());
    }
  }
}

/**
 * A seek does not fire callbacks, so the hand-drawn parts of a scene (pieces of a
 * burst, bars in flight, the walking tiger) would stay where they were. Their
 * tweens draw in onUpdate from the tweened values, which the seek did restore:
 * call them once, in timeline order.
 */
function redraw(tl: gsap.core.Timeline) {
  for (const child of tl.getChildren(true, true, false)) {
    const fn = child.vars.onUpdate;
    if (typeof fn === 'function') fn.apply(child, child.vars.onUpdateParams ?? []);
  }
}

export function startEngine() {
  window.addEventListener('scroll', updateScenes, { passive: true });
  window.addEventListener('resize', updateScenes);
  updateScenes();
}
