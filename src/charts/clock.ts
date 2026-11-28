/**
 * The trafficking clock, drawn the same way for the story (03) and the dashboard.
 * One slice = one year, 2000 → 2025 clockwise; rings inside → out: wild tigers,
 * seizures, tigers seized, % outside the range, whole animals, trophy / amulet,
 * people jailed. Each ring has its own scale.
 */
import { arc } from 'd3-shape';
import { EVENTS, YEAR_COLORS as C, years, type YearRow } from '../data/series';
import { svgEl } from './faces';

const fmt = new Intl.NumberFormat('en-GB');

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

export const LEGEND = [
  [C.seizures, 'seizures in tiger range countries'], ['#111', 'whole animals: dead (% of seizures)'],
  [C.amulet, '● amulet: claws + teeth (% of part records)', 'dot'], ['#fff', 'outside tiger range (seizures, tigers, % tone)'],
  ['hatch', 'whole animals: live (% of seizures)'], [C.jailed, 'people jailed (2000–2021)'],
  [C.tigers, 'tigers seized in tiger range countries'], [C.trophy, '● trophy: skins + bones (% of part records)', 'dot'],
  [C.wild, '- - wild tigers (census: 2000, 2010, 2016, 2023)', 'dash'],
];

export function clockCard(y: YearRow) {
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


export interface ClockHooks { enter(i: number): void; leave(): void; toggle(i: number): void }
export interface DrawnClock {
  decor: SVGGElement; centre: SVGGElement; yearGs: SVGGElement[]; hits: SVGPathElement[];
  /** Outline of a year's slice, for the highlight */
  highlightArc(i: number): string;
}

/** Draws the clock centred on `root`'s origin, radius R (needs the hatch pattern "clock-hatch") */
export function drawClock(root: SVGGElement, R: number, hooks: ClockHooks): DrawnClock {
  let decor: SVGGElement, centre: SVGGElement;
  const hits: SVGPathElement[] = [];
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
  const yearGs = years.map((y, i) => {
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
    hit.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hooks.enter(i); });
    hit.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hooks.leave(); });
    hit.addEventListener('click', () => hooks.toggle(i));
    hit.addEventListener('focus', () => hooks.enter(i));
    hit.addEventListener('blur', () => hooks.leave());
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
  const highlightArc = (i: number) => arc()({ innerRadius: 0.3 * R, outerRadius: 1.04 * R, startAngle: a0(i), endAngle: a0(i) + step })!;
  return { decor, centre, yearGs, hits, highlightArc };
}
