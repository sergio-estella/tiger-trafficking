/**
 * 06 · Seizures recorded, 2020 – June 2025 (frames 86–91).
 *
 * One hexagon per tiger-range country, laid out roughly as on a map. In each:
 * a green circle for its wild tigers (2023, area ∝ number; dashed when there are
 * none), a hatched fill from the bottom for the % of seizures with whole animals,
 * the outline in the country colour of "People jailed". From the six year tags
 * (top right) one thread per country and year runs down to it: thread width =
 * seizures that year. Outside the tiger range, grey hexagons (2000 – June 2025).
 *
 *  hidden → in   the hexagons pop in, the threads pour down from the years;
 *                HOLD · EXPLORE: hover / tap a country or a year to follow its
 *                threads (a click keeps it selected)
 *  in → out      blood: drops start to fall, one, then another, then many, and
 *                the red rises from the bottom until it fills the page (87–91);
 *                chapter 07 carries on, on red
 */
import { gsap } from 'gsap';
import { registerScene } from '../engine';
import { parseCsv } from '../data/series';
import { svgEl } from '../charts/faces';
import { drawHexmap, range, type Hexmap } from '../charts/hexmap';
import countriesCsv from '../data/data_countries.csv?raw';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FPS = 12;
const vw = () => window.innerWidth;
const vh = () => window.innerHeight;
const fmt = new Intl.NumberFormat('en-GB');

export function buildSeizures(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'scene seizures';
  section.dataset.frames = '86–91';
  section.style.height = '230vh';
  section.setAttribute('aria-label', 'Seizures recorded by country, 2020 – June 2025');
  section.innerHTML = `
    <div class="scene__stage seizures__stage">
      <svg class="seizures__svg" aria-hidden="true"></svg>
      <div class="seizures__card" hidden></div>
      <svg class="seizures__blood" aria-hidden="true"></svg>
    </div>`;
  const stage = section.querySelector<HTMLElement>('.seizures__stage')!;
  const svg = section.querySelector<SVGSVGElement>('.seizures__svg')!;
  const card = section.querySelector<HTMLElement>('.seizures__card')!;
  const blood = section.querySelector<SVGSVGElement>('.seizures__blood')!;

  let root: SVGGElement;
  let hexGs: SVGGElement[] = [];
  let outsideGs: SVGGElement[] = [];
  let tags: SVGGElement[] = [];
  let threads: { el: SVGPathElement; c: number; y: number }[] = [];
  let notes: SVGGElement;
  let k = 1;

  function layout() {
    svg.innerHTML = '';
    const W = vw(), H = vh();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // the 1440 × 900 frame, fitted inside the screen
    // phones: only the hexagons and their threads (the key and the grey hexagons are left out)
    const box = H > W ? { x: 430, y: 40, w: 820, h: 790 } : { x: 0, y: 0, w: 1440, h: 900 };
    k = Math.min(W / box.w, H / box.h);
    const ox = (W - box.w * k) / 2 - box.x * k, oy = (H - box.h * k) / 2 - box.y * k;
    stage.classList.toggle('is-narrow', H > W);
    root = svgEl('g', { transform: `translate(${ox} ${oy}) scale(${k})` });
    svg.append(root);
    hex = drawHexmap(root, card, stage, () => explorable);
    ({ hexGs, outsideGs, tags, threads, notes } = hex);
    buildBlood();
  }

  // ---------------------------------------------------------------- explore
  let explorable = false;
  let hex: Hexmap;
  // ---------------------------------------------------------------- blood
  // As drawn in 87–91: long angular drops (a needle tail on top, a faceted bulb below)
  // fall through the page, few at first and then more and more, while the red rises
  // from the bottom with a jagged edge; drops that reach it sink in and leave spikes.
  type Drop = { el: SVGPathElement; x: number; w: number; len: number; t0: number; v: number };
  let drops: Drop[] = [];
  let flood: SVGPathElement;
  const N = 46;
  const T_RAIN = 1.7;   // the last drop starts falling here
  const T_FLOOD = [0.55, 2.35] as const;
  const dropD = (w: number, L: number) => {
    const h = w / 2;
    return `M0,0 L${h * 0.22},${L * 0.45} L${h * 0.62},${L * 0.72} L${h},${L * 0.86} L${h * 0.55},${L} L${-h * 0.55},${L} L${-h},${L * 0.86} L${-h * 0.62},${L * 0.72} L${-h * 0.22},${L * 0.45}Z`;
  };
  // a fixed shuffle, so every run (and every rebuild) looks the same
  const rnd = (i: number, k: number) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  function buildBlood() {
    blood.innerHTML = '';
    const W = vw(), H = vh();
    const u = Math.max(W / 1440, H / 900);
    blood.setAttribute('viewBox', `0 0 ${W} ${H}`);
    drops = [];
    for (let i = 0; i < N; i++) {
      const w = (38 + rnd(i, 1) * 34) * u;
      const len = w * (4.5 + rnd(i, 2) * 4);
      const el = svgEl('path', { d: dropD(w, len), class: 'seizures__drop' });
      blood.append(el);
      drops.push({
        el, w, len,
        x: W * (0.03 + 0.94 * rnd(i, 3)),
        t0: T_RAIN * Math.pow(i / N, 0.6),          // far apart first, then faster and faster
        v: H * (0.9 + rnd(i, 4) * 0.8),              // px / s when it lets go
      });
    }
    flood = svgEl('path', { class: 'seizures__drop' });
    blood.append(flood); // on top: the drops sink into it, their tails stick out as spikes
    renderBlood();
  }
  const bl = { t: 0 };
  const floodTop = (t: number) => {
    const H = vh();
    const f = Math.max(0, Math.min(1, (t - T_FLOOD[0]) / (T_FLOOD[1] - T_FLOOD[0])));
    return H * (1.02 - 1.15 * f * f * (3 - 2 * f));
  };
  const renderBlood = () => {
    const W = vw(), H = vh();
    const t = Math.floor(bl.t * FPS + 1e-6) / FPS; // on twos
    for (const d of drops) {
      const a = t - d.t0;
      if (a < 0) { d.el.style.visibility = 'hidden'; continue; }
      // it swells at the top edge for a moment (the drip), then lets go and falls faster and faster
      const swell = Math.min(1, a / 0.12);
      const fall = Math.max(0, a - 0.12);
      const y = -d.len + d.len * 0.35 * swell + d.v * fall + 0.5 * 2.2 * H * fall * fall;
      d.el.style.visibility = y > H ? 'hidden' : 'visible';
      d.el.setAttribute('transform', `translate(${d.x.toFixed(1)} ${y.toFixed(1)})`);
    }
    const top = floodTop(t);
    if (top >= H) { flood.setAttribute('d', ''); return; }
    let d = `M0,${H + 2}`;
    const n = 12;
    for (let i = 0; i <= n; i++) d += `L${((W * i) / n).toFixed(1)},${(top + (rnd(i, 9) - 0.5) * H * 0.07).toFixed(1)}`;
    flood.setAttribute('d', `${d}L${W},${H + 2}Z`);
  };

  // ---------------------------------------------------------------- timeline
  let tl = gsap.timeline({ paused: true });
  function build() {
    const progress = tl.progress();
    tl.kill();
    layout();
    const D = reduced ? 0.01 : 1;
    tl = gsap.timeline({ paused: true });
    const order = range.map((_, i) => i).sort((a, b) => range[b].seizures - range[a].seizures);
    tl.addLabel('hidden')
      .fromTo(order.map((i) => hexGs[i].firstElementChild), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.17 * D, ease: 'steps(2)', stagger: 0.05 * D }, 0)
      .fromTo(tags, { autoAlpha: 0, y: -20 }, { autoAlpha: 1, y: 0, duration: 0.17 * D, ease: 'steps(2)', stagger: 0.05 * D }, 0.5 * D)
      .fromTo(threads.map((t) => t.el), { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7 * D, ease: `steps(${Math.round(0.7 * FPS)})`, stagger: 0.008 * D }, 0.8 * D)
      .fromTo([...outsideGs, notes, root.querySelector('.seizures__how'), root.querySelector('.seizures__foot'), root.querySelector('.seizures__outside')],
        { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'steps(2)', stagger: 0.04 }, 1.4 * D)
      .addLabel('in')
      // 87 → 91: blood
      .call(() => hex.reset(), [], 'in+=0.01')
      .fromTo(bl, { t: 0 }, { t: 2.45, duration: 2.45 * D, ease: 'none', onUpdate: renderBlood, immediateRender: false }, 'in+=0.01')
      .addLabel('out');
    renderBlood();
    tl.progress(progress);
  }
  build();
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(build, 200); });

  registerScene({
    section, get tl() { return tl; }, labels: ['hidden', 'in', 'out'], at: [-0.35, 1.0], cutBackFrom: 2, passAt: [1],
    onStep: (i) => { explorable = i === 1; stage.classList.toggle('is-explorable', explorable); if (!explorable) hex.reset(); },
  } as Parameters<typeof registerScene>[0]);
  return section;
}
