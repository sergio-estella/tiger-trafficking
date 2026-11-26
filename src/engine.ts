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
}

const scenes: Stepped[] = [];
const vh = () => window.innerHeight;

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
    if (cut) s.tl.pause().seek(s.labels[index]);
    else s.tween = s.tl.tweenTo(s.labels[index], { ease: 'none' });
  }
}

export function startEngine() {
  window.addEventListener('scroll', updateScenes, { passive: true });
  window.addEventListener('resize', updateScenes);
  updateScenes();
}
