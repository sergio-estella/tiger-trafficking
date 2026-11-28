/**
 * 03 · "The trafficking clock" (frames 35–41).
 *
 * One slice = one year, 2000 → 2025 clockwise (2025 = January–June, dashed),
 * a gap at 12 o'clock for the ring names. Rings, inside → out:
 *   wild tigers (census line) · seizures (tiger range + outside) · tigers seized
 *   (range + outside) · % of seizures outside the range (tone) · whole animals
 *   (dead + live, % of seizures) · trophy / amulet (% of part records) ·
 *   people jailed (2000–2021).
 *
 *  hidden → in   an orange disc rolls in from the right and the clock draws
 *                itself slice by slice (35 → 39); HOLD · EXPLORE: hover / tap a
 *                slice to read that year
 *  in → out      the clock falls apart (40 → 41) and the page carries on
 */
import { gsap } from 'gsap';
import { arc } from 'd3-shape';
import { registerScene } from '../engine';
import { EVENTS, YEAR_COLORS as C, years, type YearRow } from '../data/series';
import { hatchDefs, svgEl } from '../charts/faces';
import { placeTip, type Side } from '../tip';

const fmt = new Intl.NumberFormat('en-GB');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const vw = () => window.innerWidth;
const vh = () => window.innerHeight;
const portrait = () => vh() > vw();

// Ring bands as fractions of the clock radius
const RING = {
  wild: [0.2, 0.3], seizures: [0.32, 0.47], tigers: [0.49, 0.64], outside: [0.66, 0.7],
  whole: [0.72, 0.83], parts: [0.85, 0.91], jailed: [0.93, 1.0],
} as const;
const RING_NAMES: [keyof typeof RING, string, string][] = [
  ['jailed', 'people jailed', C.jailed], ['parts', 'trophy / amulet', C.trophy], ['whole', 'whole animals', '#111'],
  ['outside', '% outside range', '#111'], ['tigers', 'tigers seized', C.tigers], ['seizures', 'seizures', C.seizures],
  ['wild', 'wild tigers', C.wild],
];

const LEGEND = [
  [C.seizures, 'seizures in tiger range countries'], ['#111', 'whole animals: dead (% of seizures)'],
  [C.amulet, '● amulet: claws + teeth (% of part records)', 'dot'], ['#fff', 'outside tiger range (seizures, tigers, % tone)'],
  ['hatch', 'whole animals: live (% of seizures)'], [C.jailed, 'people jailed (2000–2021)'],
  [C.tigers, 'tigers seized in tiger range countries'], [C.trophy, '● trophy: skins + bones (% of part records)', 'dot'],
  [C.wild, '- - wild tigers (census: 2000, 2010, 2016, 2023)', 'dash'],
];

function card(y: YearRow) {
  const n = (v: number | null) => (v == null ? '—' : fmt.format(v));
  const p = (v: number | null) => (v == null ? '—' : `${Math.round(v)}%`);
  const whole = y.pctDead == null ? '—' : `${Math.round((y.pctDead ?? 0) + (y.pctLive ?? 0))}% <small>(dead ${p(y.pctDead)}, live ${p(y.pctLive)})</small>`;
  return `<strong class="clock-card__year">${y.year}${y.partial ? ' <small>Jan–Jun</small>' : ''}</strong>
    <dl>
      <dt>Seizures</dt><dd>${n(y.seizures)} <small>${y.seizuresRange == null ? '' : `${n(y.seizuresRange)} in range · ${n(y.seizuresOutside)} outside`}</small></dd>
      <dt>Tigers seized</dt><dd>${n(y.tigersTotal)} <small>${y.tigersRange == null ? 'range / outside split n/a' : `${n(y.tigersRange)} in range · ${n(y.tigersOutside)} outside`}</small></dd>
      <dt>Whole animals</dt><dd>${whole}</dd>
      <dt>Trophy / amulet</dt><dd>${p(y.pctTrophy)} / ${p(y.pctAmulet)}</dd>
      <dt>People jailed</dt><dd>${y.jailed == null ? '<small>no data 2022–25</small>' : n(y.jailed)}</dd>
    </dl>${EVENTS[y.year] ? `<p class="clock-card__event">${EVENTS[y.year]}</p>` : ''}`;
}

export function buildClock(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'scene clock';
  section.dataset.frames = '35–41';
  section.style.height = '250vh';
  section.setAttribute('aria-label', 'The trafficking clock, 2000 – June 2025');
  section.innerHTML = `
    <div class="scene__stage clock__stage">
      <h2 class="clock__head display">The trafficking clock</h2>
      <svg class="clock__svg" aria-hidden="true"></svg>
      <ul class="clock__legend">${LEGEND.map(([c, t, kind]) => `<li><span class="clock__sw clock__sw--${kind ?? 'box'}" style="--c:${c}"></span>${t}</li>`).join('')}</ul>
      <p class="clock__note">All rings read on the same radius: one year = one slice. Rings are drawn to their own scale. 2025 = January–June (dashed).</p>
      <div class="clock-card" hidden></div>
    </div>`;
  const stage = section.querySelector<HTMLElement>('.clock__stage')!;
  const svg = section.querySelector<SVGSVGElement>('.clock__svg')!;
  const legend = section.querySelector<HTMLElement>('.clock__legend')!;
  const headline = section.querySelector<HTMLElement>('.clock__head')!;
  const note = section.querySelector<HTMLElement>('.clock__note')!;
  const cardEl = section.querySelector<HTMLElement>('.clock-card')!;

  let ball: SVGGElement, centre: SVGGElement;
  let yearGs: SVGGElement[] = [];
  let decor: SVGGElement;
  let highlight: SVGPathElement;
  let cx = 0, cy = 0, R = 0;
  let explorable = false;

  function layout() {
    svg.innerHTML = '';
    const W = vw(), H = vh();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.append(hatchDefs('clock-hatch', 4));
    R = portrait() ? Math.min(W * 0.44, H * 0.28) : Math.min(H * 0.44, W * 0.3);
    cx = portrait() ? W / 2 : W * 0.39;
    cy = portrait() ? H * 0.36 : H * 0.5;
    const root = svgEl('g', { transform: `translate(${cx} ${cy})` });
    rootG = root;
    svg.append(root);

    // 26 slices + a 1.5-slice gap at 12 o'clock for the ring names
    const step = (2 * Math.PI) / (years.length + 1.5);
    const a0 = (i: number) => (0.75 + i) * step;
    const pad = step * 0.06;
    const band = (r0: number, r1: number, i: number) =>
      arc()({ innerRadius: r0 * R, outerRadius: r1 * R, startAngle: a0(i) + pad, endAngle: a0(i) + step - pad })!;

    // Events: yellow wedges with their names outside the clock
    decor = svgEl('g', { class: 'clock__decor', 'pointer-events': 'none' });
    root.append(decor);
    for (const [yr, name] of Object.entries(EVENTS)) {
      const i = years.findIndex((y) => y.year === Number(yr));
      decor.append(svgEl('path', { d: arc()({ innerRadius: 0.3 * R, outerRadius: 1.05 * R, startAngle: a0(i), endAngle: a0(i) + step })!, class: 'clock__event' }));
      const mid = a0(i) + step / 2, rr = R * 1.16;
      const x = Math.sin(mid) * rr, y = -Math.cos(mid) * rr;
      const t = svgEl('text', { x, y, class: 'clock__event-label', 'text-anchor': x < 0 ? 'end' : 'start' });
      t.textContent = `${yr} · ${name.replace(/ \(.*\)$/, '').replace(', Thailand', '')}`;
      decor.append(t);
    }
    const max = {
      seizures: Math.max(...years.map((y) => y.seizures)),
      tigers: Math.max(...years.map((y) => y.tigersTotal ?? 0)),
      whole: 50, jailed: Math.max(...years.map((y) => y.jailed ?? 0)),
    };
    const lerp = (b: readonly [number, number], u: number) => b[0] + (b[1] - b[0]) * Math.max(0, Math.min(1, u));

    // One group per year
    yearGs = years.map((y, i) => {
      const g = svgEl('g', { class: 'clock__year', 'data-year': y.year });
      const add = (d: string, fill: string, extra: Record<string, string | number> = {}) => g.append(svgEl('path', { d, fill, ...extra }));
      // seizures: range + outside (stacked)
      if (y.seizuresRange != null) {
        const u1 = y.seizuresRange / max.seizures, u2 = (y.seizuresRange + (y.seizuresOutside ?? 0)) / max.seizures;
        add(band(RING.seizures[0], lerp(RING.seizures, u1), i), C.seizures);
        add(band(lerp(RING.seizures, u1), lerp(RING.seizures, u2), i), C.outside, { class: 'clock__outside' });
      } else add(band(RING.seizures[0], lerp(RING.seizures, y.seizures / max.seizures), i), C.seizures, { class: 'clock__partial' });
      // tigers seized
      if (y.tigersRange != null) {
        const u1 = y.tigersRange / max.tigers, u2 = (y.tigersTotal ?? 0) / max.tigers;
        add(band(RING.tigers[0], lerp(RING.tigers, u1), i), C.tigers);
        add(band(lerp(RING.tigers, u1), lerp(RING.tigers, u2), i), C.outside, { class: 'clock__outside' });
      } else if (y.tigersTotal != null) add(band(RING.tigers[0], lerp(RING.tigers, y.tigersTotal / max.tigers), i), C.tigers, { class: 'clock__partial' });
      // % outside: tone
      if (y.pctOutside != null) add(band(RING.outside[0], RING.outside[1], i), '#111', { 'fill-opacity': Math.min(0.9, 0.1 + y.pctOutside / 45) });
      // whole animals: dead + live
      if (y.pctDead != null) {
        const ud = y.pctDead / max.whole, ul = (y.pctDead + (y.pctLive ?? 0)) / max.whole;
        add(band(RING.whole[0], lerp(RING.whole, ud), i), C.dead);
        add(band(lerp(RING.whole, ud), lerp(RING.whole, ul), i), 'url(#clock-hatch)');
      }
      // trophy / amulet: two dots on the band
      const mid = a0(i) + step / 2;
      const dotAt = (pct: number | null, color: string) => {
        if (pct == null) return;
        const r = lerp(RING.parts, pct / 80) * R;
        g.append(svgEl('circle', { cx: Math.sin(mid) * r, cy: -Math.cos(mid) * r, r: Math.max(2, R * 0.009), fill: color }));
      };
      dotAt(y.pctTrophy, C.trophy);
      dotAt(y.pctAmulet, C.amulet);
      // people jailed
      if (y.jailed != null && y.jailed > 0) {
        add(band(RING.jailed[0], lerp(RING.jailed, y.jailed / max.jailed), i), C.jailed);
        if (y.jailed >= 50) {
          const r = R * 0.965;
          const t = svgEl('text', { x: Math.sin(mid) * r, y: -Math.cos(mid) * r + 4, class: 'clock__jailed', 'text-anchor': 'middle' });
          t.textContent = String(y.jailed);
          g.append(t);
        }
      }
      // year label
      const rl = R * 1.07;
      const t = svgEl('text', { x: Math.sin(mid) * rl, y: -Math.cos(mid) * rl + 4, class: 'clock__label', 'text-anchor': 'middle' });
      t.textContent = y.partial ? `${y.year}*` : String(y.year);
      g.append(t);
      // hit area
      const hit = svgEl('path', { d: arc()({ innerRadius: 0.3 * R, outerRadius: 1.12 * R, startAngle: a0(i), endAngle: a0(i) + step })!, class: 'clock__hit', tabindex: 0, role: 'button', 'aria-label': String(y.year) });
      hit.addEventListener('pointerenter', (e) => { if (explorable && e.pointerType === 'mouse') show(i); });
      hit.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') show(null); });
      hit.addEventListener('click', () => { if (explorable) show(current === i ? null : i); });
      hit.addEventListener('focus', () => { if (explorable) show(i); });
      hit.addEventListener('blur', () => show(null));
      g.append(hit);
      hits[i] = hit;
      root.append(g);
      return g;
    });

    // Wild tigers: dashed line through the census values
    const census = years.map((y, i) => ({ i, v: y.wildCensus })).filter((d) => d.v != null) as { i: number; v: number }[];
    const wmax = Math.max(...census.map((d) => d.v)), wmin = Math.min(...census.map((d) => d.v)) * 0.8;
    const wpt = (i: number, v: number) => {
      const a = a0(i) + step / 2, r = lerp(RING.wild, (v - wmin) / (wmax - wmin)) * R;
      return [Math.sin(a) * r, -Math.cos(a) * r];
    };
    let d = '';
    for (let k = 0; k < census.length - 1; k++) {
      const A = census[k], B = census[k + 1];
      for (let i = A.i; i <= B.i; i++) {
        const v = A.v + ((B.v - A.v) * (i - A.i)) / (B.i - A.i);
        const [x, y] = wpt(i, v);
        d += `${d ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      }
    }
    decor.append(svgEl('path', { d, class: 'clock__wild' }));
    for (const c of census) {
      const [x, y] = wpt(c.i, c.v);
      decor.append(svgEl('circle', { cx: x, cy: y, r: 3, fill: C.wild }));
      const t = svgEl('text', { x, y: y - 7, class: 'clock__wild-label', 'text-anchor': 'middle' });
      t.textContent = fmt.format(c.v);
      decor.append(t);
    }
    // Ring names in the gap at 12 o'clock
    for (const [key, name, color] of RING_NAMES) {
      const r = ((RING[key][0] + RING[key][1]) / 2) * R;
      const t = svgEl('text', { x: 0, y: -r + 4, class: 'clock__ring-name', 'text-anchor': 'middle', fill: color });
      t.textContent = name;
      decor.append(t);
    }
    // Centre
    centre = svgEl('g', { class: 'clock__centre', 'pointer-events': 'none' });
    // (the headline sits top right, with the legend)
    const t1 = svgEl('text', { x: 0, y: -3, 'text-anchor': 'middle', class: 'clock__sub' }); t1.textContent = '2000 → 2025, clockwise';
    const t2 = svgEl('text', { x: 0, y: 10, 'text-anchor': 'middle', class: 'clock__sub' }); t2.textContent = 'one slice = one year';
    centre.append(t1, t2);
    root.append(centre);
    // 2016 annotation
    const i16 = years.findIndex((y) => y.year === 2016);
    const m16 = a0(i16) + step / 2;
    const ax = Math.sin(m16) * R * 1.25, ay = -Math.cos(m16) * R * 1.25;
    const ann = svgEl('text', { x: ax, y: ay, class: 'clock__ann', 'text-anchor': 'end' });
    ann.innerHTML = '<tspan font-weight="700">320 tigers seized,</tspan><tspan x="' + ax + '" dy="1.2em">the most of any year</tspan>';
    decor.append(ann);

    highlight = svgEl('path', { class: 'clock__highlight', 'pointer-events': 'none' });
    root.append(highlight);
    // The disc that rolls in
    // (on top of the clock: it hides it until it fades away; the small dot shows it is rolling)
    ball = svgEl('g', { class: 'clock__ball', 'pointer-events': 'none' }); // faded, it must not catch the hover
    ball.append(svgEl('circle', { cx: 0, cy: 0, r: R * 1.07, fill: C.seizures, class: 'clock__disc' })); // covers the event wedges (1.05 R) too
    ball.append(svgEl('circle', { cx: R * 0.33, cy: R * 0.72, r: R * 0.11, fill: '#741505' }));
    root.append(ball);
    radius = R * 1.07;
    current = null;
    // highlight geometry
    highlightArc = (i: number) => arc()({ innerRadius: 0.3 * R, outerRadius: 1.04 * R, startAngle: a0(i), endAngle: a0(i) + step })!;
  }

  let current: number | null = null;
  const hits: SVGPathElement[] = [];
  let highlightArc = (_i: number) => '';
  function show(i: number | null) {
    current = i;
    if (i === null) { highlight.setAttribute('d', ''); cardEl.hidden = true; return; }
    highlight.setAttribute('d', highlightArc(i));
    cardEl.innerHTML = card(years[i]);
    cardEl.hidden = false;
    // next to the slice, on its outer side, never over the slice nor the legend
    const a = hits[i].getBoundingClientRect();
    const right = a.left + a.width / 2 > cx, down = a.top + a.height / 2 > cy;
    const order: Side[] = [right ? 'right' : 'left', down ? 'below' : 'above', down ? 'above' : 'below', right ? 'left' : 'right'];
    placeTip(cardEl, a, [legend.getBoundingClientRect(), note.getBoundingClientRect(), headline.getBoundingClientRect()], order);
  }

  // ---------------------------------------------------------------- timeline
  const FPS = 12;
  let tl = gsap.timeline({ paused: true });
  let radius = 1;
  let rootG: SVGGElement;
  function build() {
    const progress = tl.progress();
    tl.kill();
    layout();
    const D = reduced ? 0.01 : 1;
    const spread = yearGs.map((_, i) => {
      const a = ((0.75 + i + 0.5) * 2 * Math.PI) / (years.length + 1.5);
      const dist = (0.6 + ((i * 37) % 10) / 12) * Math.max(vw(), vh());
      return { x: Math.sin(a) * dist, y: -Math.cos(a) * dist, r: (i % 2 ? 1 : -1) * (25 + ((i * 53) % 50)) };
    });
    // the ball rolls without slipping: it turns one radian per radius travelled
    const roll = { x: 1 };
    const travel = vw() * 0.9;
    let lastFrame = -1;
    const renderRoll = () => {
      const frame = Math.round(tl.time() * FPS); // drawn on twos (12 per second)
      if (frame === lastFrame && roll.x > 0 && roll.x < 1) return;
      lastFrame = frame;
      const px = roll.x * travel;
      ball.setAttribute('transform', `translate(${px} 0) rotate(${(px / radius) * (180 / Math.PI)})`);
    };
    const texts = Array.from(rootG.querySelectorAll<SVGTextElement>('text')).filter((t) => !centre.contains(t));
    gsap.set([...yearGs, decor], { opacity: 0 });
    tl = gsap.timeline({ paused: true });
    tl.addLabel('hidden')
      // 35 → 37: only the ball, rolling in from the right (drawn on twos), and it settles
      .fromTo(roll, { x: 1 }, { x: 0, duration: 0.9 * D, ease: 'power2.out', onUpdate: renderRoll, immediateRender: true }, 0)
      // 38 → 39: the clock is behind it; the ball fades away and reveals it, then the words come
      .set([...yearGs, decor], { opacity: 1 }, 0.95 * D)
      .to(ball, { opacity: 0, duration: 0.5 * D, ease: 'steps(4)' }, 1.0 * D)
      .from(texts, { opacity: 0, duration: 0.3, ease: 'steps(2)' }, 1.55 * D)
      .from(centre, { opacity: 0, duration: 0.3 }, 1.55 * D)
      // fromTo, not from: the legend outlives rebuilds (resize), so its end state is written out
      .fromTo([headline, legend, note], { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }, 1.6 * D)
      .addLabel('in')
      // 40 → 41: it falls apart
      .call(() => show(null), [], 'in+=0.01')
      .to(yearGs, { x: (i: number) => spread[i].x, y: (i: number) => spread[i].y, rotation: (i: number) => spread[i].r, svgOrigin: '0 0', duration: 1.1 * D, ease: `steps(${Math.round(1.1 * FPS)})` }, 'in+=0.01')
      .to([decor, centre, headline, legend, note], { opacity: 0, duration: 0.4 * D }, 'in+=0.01')
      .to(yearGs, { opacity: 0, duration: 0.3 * D }, `in+=${0.9 * D}`)
      .addLabel('out');
    tl.progress(progress);
  }
  build();
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(build, 200); });

  registerScene({
    section, get tl() { return tl; }, labels: ['hidden', 'in', 'out'], at: [-0.35, 1.0], cutBackFrom: 2, passAt: [1],
    onStep: (i) => { explorable = i === 1; stage.classList.toggle('is-explorable', explorable); if (!explorable) show(null); },
  } as Parameters<typeof registerScene>[0]);
  return section;
}
