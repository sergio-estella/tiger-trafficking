/**
 * "What is trafficked": share (%) of each part among all part appearances, as a
 * radar. Shared by the story (04) and the dashboard (big radar + one per period).
 * Square-root radial scale; data: derived_part_shares_by_period / _by_year.csv.
 */
import { parseCsv, type PartKey } from '../data/series';
import { svgEl } from './faces';
import periodsCsv from '../data/derived_part_shares_by_period.csv?raw';
import yearsCsv from '../data/derived_part_shares_by_year.csv?raw';

// clockwise from the top, as in frame 66
export const AXES: { key: PartKey; label: string }[] = [
  { key: 'Skins', label: 'skins' }, { key: 'Skulls', label: 'skulls' }, { key: 'Bones', label: 'bones' },
  { key: 'Meat', label: 'meat' }, { key: 'Derivatives', label: 'derivatives' }, { key: 'Other_parts', label: 'other parts' },
  { key: 'Paws', label: 'paws' }, { key: 'Teeth', label: 'teeth' }, { key: 'Claws', label: 'claws' },
  { key: 'Live_tigers', label: 'live tigers' }, { key: 'Dead_tigers', label: 'dead tigers' },
];
export const GROUPS = [
  { from: 0, to: 5, label: 'trophy & traditional medicine', color: '#e2560c' },
  { from: 6, to: 8, label: 'amulet & jewellery', color: '#741505' },
  { from: 9, to: 10, label: 'whole animal', color: '#111111' },
];
export const PERIOD_COLORS = ['#8a7a66', '#f6a33b', '#e2560c', '#9e220a', '#111111'];
export const YEAR_STOPS = ['#a89a86', '#f6a33b', '#e2560c', '#9e220a', '#111111'];
export const MAX = 55; // % at the outer ring (square-root scale)
export const RINGS = [1, 10, 25, 50];

export const periods = parseCsv(periodsCsv).map((r) => ({
  label: r.period, total: Number(r.part_appearances_total), from: Number(r.year_from), to: Number(r.year_to),
  v: AXES.map((a) => Number(r[`pct_${a.key}`])),
}));
export const periodOf = (year: number) => periods.findIndex((p) => year >= p.from && year <= p.to);
export const yearRows = parseCsv(yearsCsv).map((r) => ({ year: Number(r.year), v: AXES.map((a) => Number(r[`pct_${a.key}`])) }));

export function lerpHex(stops: string[], t: number) {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  const a = parseInt(stops[i].slice(1), 16), b = parseInt(stops[i + 1].slice(1), 16);
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - f) + ((b >> s) & 255) * f);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
export const val = (p: (typeof periods)[number], key: PartKey) => p.v[AXES.findIndex((a) => a.key === key)];


export interface RadarOptions {
  /** Axis names, ring ticks and the three group arcs (off for the small multiples) */
  labels?: boolean;
  /** Thin lines, one per year (only those of `only` if set) */
  yearLines?: boolean;
  /** Draw only this period's shape */
  only?: number;
}
export interface DrawnRadar { web: SVGGElement; yearLines: SVGPathElement[]; shapes: SVGGElement[]; groupArcs: SVGGElement }

export function drawRadar(chart: SVGGElement, R: number, opts: RadarOptions = {}): DrawnRadar {
  const labels = opts.labels ?? true;
  const angle = (i: number) => (i / AXES.length) * Math.PI * 2;
  const pt = (i: number, v: number): [number, number] => {
    const r = Math.sqrt(Math.max(0, v) / MAX) * R;
    return [Math.sin(angle(i)) * r, -Math.cos(angle(i)) * r];
  };
  const shapeD = (v: number[]) => v.map((x, i) => `${i ? 'L' : 'M'}${pt(i, x).map((n) => n.toFixed(1)).join(',')}`).join('') + 'Z';
  let web: SVGGElement, yearLines: SVGPathElement[], shapes: SVGGElement[], groupArcs: SVGGElement;
  // web: rings + spokes + axis names
  web = svgEl('g', { class: 'radar__web' });
  for (const ring of RINGS) {
    const d = AXES.map((_, i) => `${i ? 'L' : 'M'}${pt(i, ring).join(',')}`).join('') + 'Z';
    web.append(svgEl('path', { d, class: 'radar__ring' }));
    const [x, y] = pt(1, ring);
    if (!labels) continue;
    const t = svgEl('text', { x: x + 4, y: y - 3, class: 'radar__tick' });
    t.textContent = `${ring}%`;
    web.append(t);
  }
  AXES.forEach((a, i) => {
    const [x, y] = pt(i, MAX);
    web.append(svgEl('line', { x1: 0, y1: 0, x2: x, y2: y, class: 'radar__spoke' }));
    if (!labels) return;
    const [lx, ly] = pt(i, MAX * 1.22);
    const t = svgEl('text', { x: lx, y: ly + 5, 'text-anchor': 'middle', class: 'radar__axis' });
    t.textContent = a.label;
    web.append(t);
  });

  // thin lines, one per year
  const yg = svgEl('g', { class: 'radar__year-lines' });
  yearLines = (opts.yearLines === false ? [] : yearRows.filter((y) => opts.only === undefined || periodOf(y.year) === opts.only)).map((y) => {
    const p = svgEl('path', { d: shapeD(y.v), stroke: lerpHex(YEAR_STOPS, (y.year - 2000) / 25), class: 'radar__year' });
    yg.append(p);
    return p;
  });

  // period shapes (each in its own group: it grows from the centre)
  const sg = svgEl('g');
  shapes = periods.map((p, i) => {
    const g = svgEl('g', { class: 'radar__shape', 'data-i': i });
    if (opts.only !== undefined && opts.only !== i) return g;
    g.append(svgEl('path', { d: shapeD(p.v), stroke: PERIOD_COLORS[i], fill: PERIOD_COLORS[i] }));
    sg.append(g);
    return g;
  });

  // the three groups around the edge
  groupArcs = svgEl('g', { class: 'radar__groups' });
  const step = (Math.PI * 2) / AXES.length;
  const RA = R * 1.36;
  for (const gr of labels ? GROUPS : []) {
    const a0 = angle(gr.from) - step * 0.42, a1 = angle(gr.to) + step * 0.42;
    const p0 = [Math.sin(a0) * RA, -Math.cos(a0) * RA], p1 = [Math.sin(a1) * RA, -Math.cos(a1) * RA];
    const large = a1 - a0 > Math.PI ? 1 : 0;
    groupArcs.append(svgEl('path', { d: `M${p0.join(',')}A${RA},${RA} 0 ${large} 1 ${p1.join(',')}`, stroke: gr.color, class: 'radar__arc', pathLength: 1 }));
    const am = (a0 + a1) / 2;
    const lr = RA + 18;
    const lx = Math.sin(am) * lr, ly = -Math.cos(am) * lr;
    const t = svgEl('text', { x: lx, y: ly, fill: gr.color, class: 'radar__group', 'text-anchor': lx > 4 ? 'start' : lx < -4 ? 'end' : 'middle' });
    t.textContent = gr.label;
    groupArcs.append(t);
  }

  chart.append(web, yg, sg, groupArcs);
  return { web, yearLines, shapes, groupArcs };
}
