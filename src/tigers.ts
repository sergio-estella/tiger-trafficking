/**
 * Articulated tigers ("recortable articulado").
 *
 * Each SVG ships one group per part (body, head, jaw, legs, tail-1..3) with a
 * data-pivot in viewBox coordinates. Parts are siblings in one coordinate
 * system, so we:
 *  - nest jaw inside head (the jaw follows the head),
 *  - chain the tail: tail-3 inside tail-2 inside tail-1, keeping the original
 *    paint order (tail-3 under tail-2 under tail-1),
 *  - wrap everything in a "rig" group for whole-body bob and pitch.
 *
 * The run cycle is driven by a phase value, not by looping tweens, so it can
 * run backwards (rewind) and change speed with the main timeline.
 */
import { gsap } from 'gsap';
import frontalSvg from './assets/tigers/tigre-frontal-capas.svg?raw';
import perfilSvg from './assets/tigers/tigre-perfil-capas.svg?raw';

type PartName =
  | 'body' | 'head' | 'jaw'
  | 'front-leg-left' | 'front-leg-right' | 'hind-leg-left' | 'hind-leg-right'
  | 'tail-1' | 'tail-2' | 'tail-3';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface Tiger {
  el: HTMLElement;
  svg: SVGSVGElement;
  /** Advance the run cycle. `dPhase` in cycles (1 = one full stride). */
  step(dPhase: number): void;
  /** Return every part to the neutral pose. */
  reset(): void;
}

function mount(container: HTMLElement, markup: string): { svg: SVGSVGElement; parts: Record<PartName, SVGGElement>; rig: SVGGElement } {
  container.innerHTML = markup;
  const svg = container.querySelector('svg') as SVGSVGElement;
  const q = (n: string) => svg.querySelector(`[data-part="${n}"]`) as SVGGElement;
  const parts = {} as Record<PartName, SVGGElement>;
  (['body', 'head', 'jaw', 'front-leg-left', 'front-leg-right', 'hind-leg-left', 'hind-leg-right', 'tail-1', 'tail-2', 'tail-3'] as PartName[])
    .forEach((n) => (parts[n] = q(n)));

  // Rig wrapper: every layer except <defs> and the hidden pivot guides
  const rig = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  rig.setAttribute('class', 'rig');
  const layers = Array.from(svg.children).filter((c) => c.tagName.toLowerCase() === 'g' && (c as SVGGElement).dataset.part !== 'pivot-guides');
  svg.insertBefore(rig, layers[0]);
  layers.forEach((l) => rig.appendChild(l));

  // Jaw follows head (jaw is painted right after head in the source, so appending keeps order)
  parts.head.appendChild(parts.jaw);
  // Tail chain, keeping tail-3 under tail-2 under tail-1
  parts['tail-2'].insertBefore(parts['tail-3'], parts['tail-2'].firstChild);
  parts['tail-1'].insertBefore(parts['tail-2'], parts['tail-1'].firstChild);

  for (const n of Object.keys(parts) as PartName[]) {
    const pivot = parts[n].dataset.pivot!; // "x y" in viewBox units
    gsap.set(parts[n], { svgOrigin: pivot });
  }
  return { svg, parts, rig };
}

const TAU = Math.PI * 2;

/** Side view, running left → right. Gallop: front and hind pairs in counter-phase. */
export function createProfileTiger(container: HTMLElement): Tiger {
  const { svg, parts: p, rig } = mount(container, perfilSvg);
  const vb = svg.viewBox.baseVal;
  gsap.set(rig, { svgOrigin: `${vb.width * 0.48} ${vb.height * 0.5}` });
  let phase = 0;

  const pose = () => {
    const a = phase * TAU;
    const s = Math.sin(a);
    const c = Math.cos(a);
    // Legs. Positive rotation = clockwise in SVG (a front leg pointing right swings down/back).
    gsap.set(p['front-leg-left'], { rotation: 22 * s - 4 });
    gsap.set(p['front-leg-right'], { rotation: 22 * Math.sin(a - 0.6) - 4 });
    gsap.set(p['hind-leg-left'], { rotation: -20 * s + 2 });
    gsap.set(p['hind-leg-right'], { rotation: -20 * Math.sin(a - 0.6) + 2 });
    // Whole body: two bounces per stride would read as trotting; one bounce + pitch reads as a gallop
    gsap.set(rig, { y: -26 * Math.max(0, c), rotation: -3.5 * s });
    // Head stabilises against the pitch, jaw breathes
    gsap.set(p.head, { rotation: 3 * s });
    gsap.set(p.jaw, { rotation: 5 + 5 * Math.sin(a * 2) });
    // Tail: travelling wave, each segment lags the previous one
    gsap.set(p['tail-1'], { rotation: 8 * Math.sin(a - 0.8) });
    gsap.set(p['tail-2'], { rotation: 10 * Math.sin(a - 1.6) });
    gsap.set(p['tail-3'], { rotation: 12 * Math.sin(a - 2.4) });
  };

  return {
    el: container,
    svg,
    step(d) { phase += d; pose(); },
    reset() { phase = 0; pose(); },
  };
}

/** Front view, running towards camera: alternating legs, bob, slight sway. */
export function createFrontalTiger(container: HTMLElement): Tiger {
  const { svg, parts: p, rig } = mount(container, frontalSvg);
  const vb = svg.viewBox.baseVal;
  gsap.set(rig, { svgOrigin: `${vb.width / 2} ${vb.height * 0.75}` });
  let phase = 0;

  const pose = () => {
    const a = phase * TAU;
    const s = Math.sin(a);
    // Diagonal pairs move together (left front + right hind), the other pair in counter-phase.
    // Lifting a leg towards camera reads as a shorter leg: move it up and rotate it slightly outward.
    gsap.set(p['front-leg-left'], { y: -34 * Math.max(0, s), rotation: 6 * s });
    gsap.set(p['hind-leg-right'], { y: -20 * Math.max(0, s), rotation: -4 * s });
    gsap.set(p['front-leg-right'], { y: -34 * Math.max(0, -s), rotation: 6 * s });
    gsap.set(p['hind-leg-left'], { y: -20 * Math.max(0, -s), rotation: -4 * s });
    gsap.set(rig, { y: -18 * Math.abs(Math.cos(a)), rotation: 2 * s });
    gsap.set(p.head, { rotation: -1.5 * s, y: 4 * Math.abs(Math.cos(a)) });
    gsap.set(p.jaw, { y: 4 + 4 * Math.sin(a * 2) });
    gsap.set(p['tail-1'], { rotation: 10 * Math.sin(a - 0.8) });
    gsap.set(p['tail-2'], { rotation: 12 * Math.sin(a - 1.6) });
    gsap.set(p['tail-3'], { rotation: 14 * Math.sin(a - 2.4) });
  };

  return {
    el: container,
    svg,
    step(d) { phase += d; pose(); },
    reset() { phase = 0; pose(); },
  };
}
