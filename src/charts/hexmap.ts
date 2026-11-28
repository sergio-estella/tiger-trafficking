/**
 * Seizures recorded, 2020 – June 2025: one hexagon per tiger range country (a tile
 * map, positions approximate), threads from the six year tags (width = seizures
 * that country that year), grey hexagons for countries outside the range.
 * Drawn in the 1440 × 900 frame of the storyboard; shared by the story (06) and
 * the dashboard. Hover / tap a country or a year; a click keeps it.
 */
import { parseCsv } from '../data/series';
import { svgEl } from './faces';
import { placeTip } from '../tip';
import countriesCsv from '../data/data_countries.csv?raw';

const fmt = new Intl.NumberFormat('en-GB');

export const YEARS = ['2020', '2021', '2022', '2023', '2024', '2025*'];
export const YEAR_COLS = ['s2020', 's2021', 's2022', 's2023', 's2024', 's2025H1'];
// hexagon centres as drawn in frame 86 (1440 × 900)
export const POS: Record<string, [number, number]> = {
  India: [507, 530], Bangladesh: [593, 530], Myanmar: [679, 530], Laos: [764, 530], 'Viet Nam': [850, 530],
  Nepal: [636, 456], Bhutan: [721, 456], China: [807, 456], Russia: [850, 382],
  Thailand: [722, 604], Cambodia: [807, 604], Malaysia: [679, 678], Indonesia: [722, 752],
};
// outline = country colour, as in "People jailed"
export const OUTLINE: Record<string, string> = { India: '#e2560c', China: '#ffffff', Indonesia: '#6b3214', 'Viet Nam': '#9e220a', Nepal: '#6e5a96' };
export const THREAD: Record<string, string> = { India: '#e2560c', China: '#d9cfa0', Indonesia: '#8a4a1c', 'Viet Nam': '#9e220a', Nepal: '#8a7ab0' };
export const OTHER = '#8c8070';

const rows = parseCsv(countriesCsv);
export const range = rows.filter((r) => POS[r.country]).map((r) => ({
  name: r.country,
  pos: POS[r.country],
  seizures: Number(r.seizures_2020_25 || 0),
  byYear: YEAR_COLS.map((c) => Number(r[c] || 0)),
  whole: r.pct_whole_animals_2020_25 === '' ? null : Number(r.pct_whole_animals_2020_25),
  wild: Number(r.wild_tigers_2023 || 0),
  outline: OUTLINE[r.country] ?? OTHER,
  thread: THREAD[r.country] ?? OTHER,
}));
export const outside = rows.filter((r) => /non-range/.test(r.country)).map((r) => ({
  name: r.country.replace(' (non-range)', '').replace('United Kingdom', 'UK'),
  seizures: Number(r.seizures_2000_jun2025),
}));
export const maxWild = Math.max(...range.map((c) => c.wild));
export const yearTotals = YEAR_COLS.map((_, y) => range.reduce((s, c) => s + c.byYear[y], 0));

export const hexPath = (r: number) => {
  const p = [];
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 2; p.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`); }
  return `M${p.join('L')}Z`;
};


export interface Hexmap {
  hexGs: SVGGElement[]; outsideGs: SVGGElement[]; tags: SVGGElement[];
  threads: { el: SVGPathElement; c: number; y: number }[];
  notes: SVGGElement; how: SVGGElement; foot: SVGTextElement; outsideG: SVGGElement;
  /** Clears any selection */
  reset(): void;
}

/**
 * @param root   group in frame coordinates (1440 × 900)
 * @param card   the floating card (HTML) for the selected country or year
 * @param focusHost element that gets `has-focus` while something is selected
 * @param active whether hover / tap is live (false while a scene animates)
 */
export function drawHexmap(root: SVGGElement, card: HTMLElement, focusHost: HTMLElement, active: () => boolean = () => true): Hexmap {
  let hexGs: SVGGElement[] = [], outsideGs: SVGGElement[] = [], tags: SVGGElement[] = [];
  let threads: { el: SVGPathElement; c: number; y: number }[] = [];
  let notes: SVGGElement;
type Sel = { country?: number; year?: number } | null;
let pinned: Sel = null;
const same = (a: Sel, b: Sel) => !!a && !!b && a.country === b.country && a.year === b.year;
function focus(sel: Sel) {
  focusHost.classList.toggle('has-focus', !!sel);
  for (const t of threads) t.el.classList.toggle('is-on', !!sel && (sel.country === t.c || sel.year === t.y));
  hexGs.forEach((g, i) => g.classList.toggle('is-on', !!sel && (sel.country === i || (sel.year !== undefined && range[i].byYear[sel.year] > 0))));
  tags.forEach((g, y) => g.classList.toggle('is-on', !!sel && (sel.year === y || (sel.country !== undefined && range[sel.country].byYear[y] > 0))));
  if (!sel) { card.hidden = true; return; }
  if (sel.country !== undefined) {
    const c = range[sel.country];
    card.innerHTML = `<strong>${c.name}</strong>
      <p>${c.seizures} seizures, 2020 – June 2025 · ${c.whole == null ? 'no whole animals data' : `${c.whole}% with whole animals`}</p>
      <p>Wild tigers (2023): ${c.wild ? fmt.format(c.wild) : 'none'}</p>
      <ol class="seizures__bars">${c.byYear.map((n, y) => `<li><span>${YEARS[y]}</span><i style="width:${n * 2}px;background:${c.thread}"></i><b>${n}</b></li>`).join('')}</ol>`;
  } else {
    const y = sel.year!;
    const list = range.map((c) => ({ c, n: c.byYear[y] })).filter((d) => d.n > 0).sort((a, b) => b.n - a.n);
    card.innerHTML = `<strong>${YEARS[y].replace('*', ' (Jan–Jun)')}</strong>
      <p>${yearTotals[y]} seizures in tiger range countries</p>
      <ol class="seizures__bars">${list.map((d) => `<li><span>${d.c.name}</span><i style="width:${d.n * 2}px;background:${d.c.thread}"></i><b>${d.n}</b></li>`).join('')}</ol>`;
  }
  card.hidden = false;
  const anchorEl = sel.country !== undefined ? hexGs[sel.country] : tags[sel.year!];
  const a = anchorEl.getBoundingClientRect();
  const avoid = [...hexGs, ...tags].filter((g) => g.classList.contains('is-on')).map((g) => g.getBoundingClientRect());
  placeTip(card, a, avoid, sel.country !== undefined ? ['left', 'right', 'below', 'above'] : ['below', 'left']);
}
function bind(g: SVGGElement, sel: { country?: number; year?: number }) {
  g.addEventListener('pointerenter', (e) => { if (active() && e.pointerType === 'mouse') focus(sel); });
  g.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') focus(pinned); });
  g.addEventListener('click', () => { if (!active()) return; pinned = same(pinned, sel) ? null : sel; focus(pinned); });
  g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); g.dispatchEvent(new MouseEvent('click')); } });
}


  const defs = svgEl('defs');
  defs.innerHTML = `<pattern id="seiz-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#f6dd3c"/><line x1="0" y1="0" x2="0" y2="6" stroke="#5a4a10" stroke-width="1.6"/></pattern>`;
  root.append(defs);

  // threads first (under the hexagons)
  const tg = svgEl('g', { class: 'seizures__threads' });
  root.append(tg);
  threads = [];
  const tagX = (y: number) => 1022 + y * 39, tagY = 63;
  range.forEach((c, ci) => {
    c.byYear.forEach((n, y) => {
      if (!n) return;
      const [hx, hy] = c.pos;
      const x0 = tagX(y), y0 = tagY + 10;
      const x1 = hx, y1 = hy - 50;
      const d = `M${x0},${y0} C${x0},${y0 + 260} ${x1},${y1 - 240} ${x1},${y1}`;
      const el = svgEl('path', { d, stroke: c.thread, 'stroke-width': Math.max(0.8, n * 0.36), class: 'seizures__thread', pathLength: 1 });
      tg.append(el);
      threads.push({ el, c: ci, y });
    });
  });

  // year tags
  tags = YEARS.map((label, y) => {
    const g = svgEl('g', { class: 'seizures__tag', tabindex: 0, role: 'button', 'aria-label': `${label}: ${yearTotals[y]} seizures` });
    g.append(svgEl('rect', { x: tagX(y) - 17, y: tagY - 10, width: 34, height: 20 }));
    const t = svgEl('text', { x: tagX(y), y: tagY + 4, 'text-anchor': 'middle' });
    t.textContent = label;
    g.append(t);
    root.append(g);
    bind(g, { year: y });
    return g;
  });

  // hexagons
  hexGs = range.map((c, ci) => {
    const g = svgEl('g', { class: 'seizures__hex', transform: `translate(${c.pos[0]} ${c.pos[1]})`, tabindex: 0, role: 'button', 'aria-label': `${c.name}: ${c.seizures} seizures` });
    const inner = svgEl('g', { class: 'seizures__hex-in' });
    const clip = svgEl('clipPath', { id: `seiz-clip-${ci}` });
    clip.append(svgEl('path', { d: hexPath(49) }));
    inner.append(clip);
    inner.append(svgEl('path', { d: hexPath(49), class: 'seizures__hex-fill' }));
    if (c.whole) {
      const h = 98 * (c.whole / 100);
      inner.append(svgEl('rect', { x: -50, y: 49 - h, width: 100, height: h, fill: 'url(#seiz-hatch)', 'clip-path': `url(#seiz-clip-${ci})` }));
    }
    inner.append(svgEl('path', { d: hexPath(49), class: 'seizures__hex-line', stroke: c.outline }));
    if (c.wild > 0) inner.append(svgEl('circle', { cx: 0, cy: 0, r: Math.max(2.5, 22 * Math.sqrt(c.wild / maxWild)), class: 'seizures__wild' }));
    else inner.append(svgEl('circle', { cx: 0, cy: 0, r: 5, class: 'seizures__wild seizures__wild--none' }));
    const name = svgEl('text', { x: 0, y: -28, 'text-anchor': 'middle', class: 'seizures__name' });
    name.textContent = c.name;
    const n = svgEl('text', { x: 0, y: 27, 'text-anchor': 'middle', class: 'seizures__n' });
    n.textContent = `${c.seizures} seizures`;
    const w = svgEl('text', { x: 0, y: 37, 'text-anchor': 'middle', class: 'seizures__w' });
    w.textContent = c.whole == null ? '—' : `${c.whole}% whole`;
    inner.append(name, n, w);
    g.append(inner);
    root.append(g);
    bind(g, { country: ci });
    return g;
  });

  // how to read
  const how = svgEl('g', { class: 'seizures__how', transform: 'translate(222 108)' });
  how.innerHTML = `<text class="seizures__h">How to read each hexagon</text>
    <g transform="translate(38 58)"><path d="${hexPath(30)}" fill="#ffdd03" stroke="#e2560c" stroke-width="2"/>
      <clipPath id="seiz-clip-how"><path d="${hexPath(29)}"/></clipPath>
      <rect x="-30" y="12" width="60" height="18" fill="url(#seiz-hatch)" clip-path="url(#seiz-clip-how)"/>
      <circle r="9" class="seizures__wild"/></g>
    <text x="85" y="22" class="seizures__how-t" fill="#24520f">green circle = wild tigers (2023), area ∝ number</text>
    <text x="85" y="37" class="seizures__how-t" fill="#24520f">dashed circle = no wild tigers</text>
    <text x="85" y="52" class="seizures__how-t">hatched fill from the bottom = % of seizures</text>
    <text x="85" y="67" class="seizures__how-t">with whole animals, 2020–25</text>
    <text x="85" y="82" class="seizures__how-t">outline = country colour, as in “People jailed”</text>
    <text x="85" y="97" class="seizures__how-t">thread width = seizures that year</text>`;
  root.append(how);

  // notes
  notes = svgEl('g', { class: 'seizures__notes' });
  notes.innerHTML = `<text x="448" y="607" class="seizures__note" fill="#e2560c">India: the biggest circle</text>
    <text x="448" y="623" class="seizures__note" fill="#e2560c">and the thickest thread</text>
    <polyline points="893,532 930,572" class="seizures__leader"/>
    <text x="935" y="581" class="seizures__note" fill="#9e220a">Viet Nam: 55 seizures, 57% whole</text>
    <text x="935" y="597" class="seizures__note" fill="#9e220a">animals… and no wild tigers</text>`;
  root.append(notes);

  // outside the tiger range
  const og = svgEl('g', { class: 'seizures__outside', transform: 'translate(206 652)' });
  const oh = svgEl('text', { class: 'seizures__h' }); oh.textContent = 'Outside tiger range';
  const os = svgEl('text', { y: 19, class: 'seizures__how-t seizures__how-t--big' }); os.textContent = 'seizures 2000 – June 2025 (no yearly breakdown)';
  og.append(oh, os);
  const maxO = Math.max(...outside.map((o) => o.seizures));
  outsideGs = outside.map((o, i) => {
    const x = 29 + (i % 3) * 60 + (i >= 3 ? 30 : 0), y = 67 + (i >= 3 ? 53 : 0);
    const g = svgEl('g', { transform: `translate(${x} ${y})` });
    const shade = Math.round(60 + 110 * (1 - o.seizures / maxO));
    g.innerHTML = `<path d="${hexPath(30)}" fill="rgb(${shade},${shade},${shade})" stroke="#f7ffae" stroke-width="2"/>
      <text y="2" text-anchor="middle" class="seizures__o-n">${o.seizures}</text>
      <text y="14" text-anchor="middle" class="seizures__o-c">${o.name}</text>`;
    og.append(g);
    return g;
  });
  root.append(og);
  const foot = svgEl('text', { x: 222, y: 842, class: 'seizures__foot' });
  foot.textContent = '2025 = January–June. Positions are approximate, not a map to scale. Bhutan and Myanmar: no seizures 2020–25.';
  root.append(foot);

  return { hexGs, outsideGs, tags, threads, notes, how, foot, outsideG: og, reset: () => { pinned = null; focus(null); } };
}
