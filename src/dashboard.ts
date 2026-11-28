/**
 * Dashboard (Figma "Style test – tiger yellow flat 2"): every chart of the story on
 * one long page, no scroll animation. Each widget fades in once when it comes into
 * view; hover (mouse) or tap (touch) shows the figures; legends highlight.
 *
 * The yearly charts share one x scale ("one year = one slice, one head, one guide
 * line"): the year guides line up from section to section, as in the design.
 * Clock, radar and hexagon map are the story's own drawings (src/charts).
 */
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/700.css';
import '@fontsource/roboto-slab/700.css';
import '@fontsource/anton/400.css';
import './styles.css';
import './dashboard.css';

import { EVENTS, PARTS, YEAR_COLORS as C, parseCsv, partByKey, partTotals, pct, years, type PartKey, type YearRow } from './data/series';
import { HEAD_ASPECT, drawHead, hatchDefs, svgEl, voronoiHead } from './charts/faces';
import { drawClock, clockCard, LEGEND as CLOCK_LEGEND } from './charts/clock';
import { AXES, PERIOD_COLORS, YEAR_STOPS, drawRadar, periods, periodOf, val } from './charts/radar';
import { drawHexmap } from './charts/hexmap';
import { COUNTRIES, jailedRows, jailedTotals, jailedGrand, peakNote } from './data/jailed';
import { createMap } from './map';
import { placeTip, type Side } from './tip';
import headUrl from './assets/tiger-head.svg?url';
import keyCsv from './data/key_figures.csv?raw';
import legendCsv from './data/parts_head_legend.csv?raw';

const fmt = new Intl.NumberFormat('en-GB');
const root = document.querySelector<HTMLElement>('#dash')!;
const tip = document.querySelector<HTMLElement>('.dash-tip')!;
const narrow = () => root.clientWidth < 760;

// ------------------------------------------------------------------ key figures
const KEY = Object.fromEntries(parseCsv(keyCsv).map((r) => [r.figure, r.value]));
const k = (name: string) => fmt.format(Number(String(KEY[name]).replace(/[^\d.]/g, '')));

// ------------------------------------------------------------------ helpers
function html<T extends HTMLElement = HTMLElement>(tag: string, cls: string, inner = ''): T {
  const n = document.createElement(tag) as T;
  n.className = cls;
  n.innerHTML = inner;
  return n;
}
function svgBox(w: number, h: number, cls = '') {
  const s = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, class: `dash-svg ${cls}` });
  return s;
}
function text(parent: SVGElement, x: number, y: number, t: string, cls: string, anchor = 'start') {
  const n = svgEl('text', { x, y, class: cls, 'text-anchor': anchor });
  n.textContent = t;
  parent.append(n);
  return n;
}

/** The shared year scale: the guide line of year i sits at x(i) */
function yearScale(W: number) {
  if (W < 760) {
    const x0 = 38, x1 = W - 8;
    const band = (x1 - x0) / years.length;
    return { band, x: (i: number) => x0 + band * (i + 0.5), left: x0, right: x1 };
  }
  // as in the design (1624 wide): first guide at 200, one every 50.4
  const s = W / 1624;
  const band = 50.4 * s;
  return { band, x: (i: number) => (200 + 50.4 * i) * s, left: 150 * s, right: (200 + 50.4 * 25.5) * s };
}
const EVENT_YEARS = Object.keys(EVENTS).map(Number);
const EVENT_SHORT: Record<number, string> = { 2010: 'Global Tiger Summit', 2016: 'Tiger Temple raid', 2020: 'COVID-19' };

/** Year guides and event columns behind a yearly chart */
function guides(s: SVGSVGElement, W: number, H: number, labels = false) {
  const { x, band } = yearScale(W);
  const g = svgEl('g', { class: 'dash-guides' });
  years.forEach((y, i) => {
    if (EVENTS[y.year]) {
      g.append(svgEl('rect', { x: x(i) - band * 0.36, y: 0, width: band * 0.72, height: H, class: 'dash-event' }));
      if (labels && !narrow()) text(g, x(i), 12, EVENT_SHORT[y.year] ?? '', 'dash-event-label', 'middle');
    }
    g.append(svgEl('line', { x1: x(i), x2: x(i), y1: 0, y2: H, class: 'dash-guide' }));
  });
  s.prepend(g);
}

// ------------------------------------------------------------------ tooltip
function showTip(content: string, anchor: DOMRect, avoid: (DOMRect | null)[] = [], order: Side[] = ['above', 'right', 'left', 'below'], dark = true) {
  tip.innerHTML = content;
  tip.classList.toggle('is-light', !dark);
  tip.hidden = false;
  placeTip(tip, anchor, avoid, order);
}
const hideTip = () => { tip.hidden = true; };
window.addEventListener('scroll', hideTip, { passive: true });

/** Hover on mouse, tap on touch; a second tap (or a tap elsewhere) closes */
function hoverable(node: Element, on: () => void, off: () => void) {
  node.addEventListener('pointerenter', (e) => { if ((e as PointerEvent).pointerType === 'mouse') on(); });
  node.addEventListener('pointerleave', (e) => { if ((e as PointerEvent).pointerType === 'mouse') off(); });
  node.addEventListener('click', (e) => { e.stopPropagation(); if (node.classList.contains('is-tapped')) { node.classList.remove('is-tapped'); off(); } else { document.querySelectorAll('.is-tapped').forEach((n) => n.classList.remove('is-tapped')); node.classList.add('is-tapped'); on(); } });
  node.setAttribute('tabindex', '0');
  node.addEventListener('focus', on);
  node.addEventListener('blur', off);
}
document.addEventListener('click', () => { document.querySelectorAll('.is-tapped').forEach((n) => n.classList.remove('is-tapped')); hideTip(); });

// ------------------------------------------------------------------ sections
interface Widget { el: HTMLElement; render(width: number): void }
const widgets: Widget[] = [];
function section(id: string, title: string, sub: string, cls = ''): { el: HTMLElement; body: HTMLElement } {
  const el = html('section', `dash-sec ${cls}`);
  el.id = id;
  el.innerHTML = `<header class="dash-sec__head"><h2 class="dash-sec__title">${title}</h2>${sub ? `<p class="dash-sec__sub">${sub}</p>` : ''}</header>`;
  const body = html('div', 'dash-sec__body');
  el.append(body);
  root.append(el);
  return { el, body };
}
function widget(el: HTMLElement, render: (w: number) => void) {
  widgets.push({ el, render });
}

// ================================================================== 0 · title
{
  const hero = html('section', 'dash-hero');
  hero.innerHTML = `
    <p class="dash-hero__lines">
      <span>Around 1900 there were <b class="is-red">~${k('wild_tigers_around_1900')}</b> wild tigers.</span>
      <span>Today there are <b class="is-green">~${k('wild_tigers_2023')}</b> (2023 estimate).</span>
      <span>Between 2000 and June 2025, ${k('tigers_seized')} tigers were seized in ${k('seizures')} seizures.</span>
    </p>
    <h1 class="dash-hero__title display">
      <span class="dash-hero__tiger"><span>Tiger</span><span class="dash-hero__head" style="background-image:url('${headUrl}')" aria-hidden="true">Tiger</span></span>
      <span>Trafficking</span>
    </h1>
    <p class="dash-hero__data">Data: TRAFFIC · Skin and Bones (2022, 2025) · Global Tiger Forum (2023)</p>
    <h2 class="dash-hero__kicker display">Sold in pieces</h2>
    <p class="dash-hero__figs"><b>${k('tigers_seized')}</b> tigers seized in <b>${k('seizures')}</b> seizures · <b class="is-teal">${k('people_jailed')}</b> <span class="is-teal">people jailed 2000 – June 2022</span></p>
    <p class="dash-hero__key">Seizures 2000 – June 2025 · units seized 2000 – June 2022 · one year = one slice, one head, one guide line</p>`;
  root.append(hero);
}

// ================================================================== 1 · what was seized
{
  const { el, body } = section('seized', 'What was seized', 'Each cell of the head is one kind of tiger part. Each hexagon is that cell’s legend.', 'dash-sec--center');
  const units = new Map(parseCsv(legendCsv).map((r) => {
    const extra = r.units_extra;
    const n = r.units_seized ? fmt.format(Number(r.units_seized)) : '';
    let u = n;
    if (/^pieces: /.test(extra)) u = `${n} + ${extra.replace('pieces: ', '')} pieces`;
    else if (/^weight: /.test(extra)) u = n ? `${n} + ${extra.replace('weight: ', '')}` : extra.replace('weight: ', '');
    else if (/whiskers/.test(extra)) u = `${n} whiskers`;
    return [r.part as PartKey, u || null];
  }));
  const hex = (color: string) => `<svg viewBox="-10 -10 20 20" aria-hidden="true"><path d="M8.66,-5L8.66,5L0,10L-8.66,5L-8.66,-5L0,-10Z" fill="${color}" stroke="#111" stroke-width="1"/></svg>`;
  const item = (key: PartKey) => {
    const p = partByKey.get(key)!;
    const u = units.get(key);
    return `<li data-key="${key}">${hex(p.color)}<div>${u ? `<b>${u}</b>` : ''}<strong style="--c:${p.color}">${p.label.toLowerCase()}</strong>${u ? '' : '<span>units not reported</span>'}<small>cell: in ${fmt.format(partTotals[key])} seizures</small></div></li>`;
  };
  const wrap = html('div', 'dash-seized');
  wrap.innerHTML = `<ul class="dash-seized__legend dash-seized__legend--left">${PARTS.filter((p) => p.side === 'left').map((p) => item(p.key)).join('')}</ul>
    <div class="dash-seized__head"></div>
    <ul class="dash-seized__legend dash-seized__legend--right">${PARTS.filter((p) => p.side === 'right').map((p) => item(p.key)).join('')}</ul>`;
  body.append(wrap, html('p', 'dash-note', 'Cell size = seizures containing that part (2000 – June 2025). Numbers = units seized (2000 – June 2022).'));
  const headBox = wrap.querySelector<HTMLElement>('.dash-seized__head')!;
  const items = Array.from(wrap.querySelectorAll<HTMLElement>('li'));
  widget(el, () => {
    const w = Math.min(360, headBox.clientWidth || 320);
    const h = w * HEAD_ASPECT;
    const s = svgBox(w + 12, h + 12);
    s.append(hatchDefs('dash-hatch', 4));
    const g = svgEl('g', { transform: 'translate(6 6)' });
    s.append(g);
    const drawn = drawHead(g, voronoiHead(partTotals, w, 11), w, { hatchId: 'dash-hatch', stroke: 2.5 });
    headBox.replaceChildren(s);
    const focus = (key: PartKey | null) => {
      items.forEach((li) => li.classList.toggle('is-dim', key !== null && li.dataset.key !== key));
      for (const [kk, p] of drawn.paths) p.classList.toggle('is-dim', key !== null && kk !== key);
    };
    for (const [key, p] of drawn.paths) hoverable(p, () => focus(key), () => focus(null));
    items.forEach((li) => hoverable(li, () => focus(li.dataset.key as PartKey), () => focus(null)));
  });
}

// ================================================================== 2 · one face per year
{
  const { el, body } = section('faces', 'One face per year', 'Each head is built like the one above, from that year’s seizures. Head area = seizures that year. 2025 = January–June (dashed).');
  widget(el, (W) => {
    const { x, band } = yearScale(W);
    const H = narrow() ? 90 : 130;
    const s = svgBox(W, H);
    s.append(hatchDefs('dash-hatch-y', 3));
    guides(s, W, H);
    const maxS = Math.max(...years.map((y) => y.seizures));
    const maxW = Math.min(band * 0.92, 46);
    const base = H - 38;
    if (!narrow()) text(s, x(0) - band * 0.9, H - 8, 'seizures', 'dash-small', 'end');
    years.forEach((y, i) => {
      const w = maxW * Math.sqrt(y.seizures / maxS);
      const g = svgEl('g', { class: 'dash-hit' });
      g.append(svgEl('rect', { x: x(i) - band / 2, y: 0, width: band, height: H, fill: 'transparent' }));
      const head = svgEl('g', { transform: `translate(${x(i) - w / 2} ${base - w * HEAD_ASPECT})` });
      drawHead(head, voronoiHead(y.parts, w, y.year), w, { hatchId: 'dash-hatch-y', stroke: 0.8, dashed: y.partial });
      g.append(head);
      if (!narrow() || i % 5 === 0 || i === years.length - 1) text(g, x(i), base + 14, `${y.year}${y.partial ? '*' : ''}`, 'dash-year', 'middle');
      if (!narrow()) text(g, x(i), base + 30, String(y.seizures), 'dash-small', 'middle');
      s.append(g);
      hoverable(g, () => {
        const ct = y.parts.Claws + y.parts.Teeth;
        showTip(`<strong>${y.year}${y.partial ? ' (Jan–Jun)' : ''}</strong>${fmt.format(y.seizures)} seizures<br/>skins ${pct(y.parts.Skins, y.partTotal)}% of part records · live tigers ${pct(y.parts.Live_tigers, y.partTotal)}% · claws + teeth ${pct(ct, y.partTotal)}%`, head.getBoundingClientRect());
      }, hideTip);
    });
    body.replaceChildren(s);
  });
}

// ================================================================== 3 · the trafficking clock
{
  const { el, body } = section('clock', '', '', 'dash-sec--center');
  el.querySelector('.dash-sec__head')!.remove();
  const box = html('div', 'dash-clock');
  const legend = html('ul', 'dash-clock__legend', CLOCK_LEGEND.map(([c, t, kind]) => `<li><span class="clock__sw clock__sw--${kind ?? 'box'}" style="--c:${c}"></span>${t}</li>`).join(''));
  const note = html('p', 'dash-note', 'All rings read on the same radius: one year = one slice. Rings are drawn to their own scale. * 2025 = January–June (dashed).');
  body.append(box, legend, note);
  widget(el, (W) => {
    const S = Math.min(W, 1000);
    const R = S * (narrow() ? 0.4 : 0.34);
    const s = svgBox(S, S * (narrow() ? 0.98 : 0.86));
    s.append(hatchDefs('clock-hatch', 4));
    const g = svgEl('g', { transform: `translate(${S / 2} ${S * (narrow() ? 0.49 : 0.43)})` });
    s.append(g);
    const title = svgEl('g', { class: 'dash-clock__title' });
    let highlight: SVGPathElement;
    let current: number | null = null;
    const show = (i: number | null) => {
      current = i;
      if (i === null) { highlight.setAttribute('d', ''); hideTip(); return; }
      highlight.setAttribute('d', drawn.highlightArc(i));
      const a = drawn.hits[i].getBoundingClientRect();
      const c = s.getBoundingClientRect();
      const right = a.left + a.width / 2 > c.left + c.width / 2, down = a.top + a.height / 2 > c.top + c.height / 2;
      showTip(`<div class="dash-clock__card">${clockCard(years[i])}</div>`, a, [], [right ? 'right' : 'left', down ? 'below' : 'above', down ? 'above' : 'below', right ? 'left' : 'right']);
    };
    const drawn = drawClock(g, R, { enter: show, leave: () => show(null), toggle: (i) => show(current === i ? null : i) });
    drawn.centre.innerHTML = '';
    if (narrow()) {
      text(title, 0, -2, 'The trafficking clock', 'dash-clock__name is-small', 'middle');
      text(title, 0, 10, '2000 → 2025, clockwise', 'clock__sub', 'middle');
    } else {
      text(title, 0, -8, 'The trafficking', 'dash-clock__name', 'middle');
      text(title, 0, 18, 'clock', 'dash-clock__name', 'middle');
      text(title, 0, 40, '2000 → 2025, clockwise', 'clock__sub', 'middle');
      text(title, 0, 52, 'one slice = one year', 'clock__sub', 'middle');
    }
    drawn.centre.append(title);
    highlight = svgEl('path', { class: 'clock__highlight', 'pointer-events': 'none' });
    g.append(highlight);
    s.addEventListener('click', (e) => e.stopPropagation()); // a tap on a slice keeps its card
    box.replaceChildren(s);
  });
}

// ================================================================== 4 · seizures and tigers seized
const yearTip = (y: YearRow) => `<strong>${y.year}${y.partial ? ' (Jan–Jun)' : ''}</strong>
  <dl>
    <dt>Seizures</dt><dd>${fmt.format(y.seizures)}${y.seizuresRange != null ? ` <small>${y.seizuresRange} in range · ${y.seizuresOutside} outside (${y.pctOutside}%)</small>` : ''}</dd>
    <dt>Tigers seized</dt><dd>${y.tigersTotal == null ? '—' : fmt.format(y.tigersTotal)}${y.tigersRange != null ? ` <small>${y.tigersRange} in range · ${y.tigersOutside} outside</small>` : ' <small>split n/a</small>'}</dd>
    <dt>Tigers per seizure</dt><dd>${y.tigersTotal && y.seizures ? (y.tigersTotal / y.seizures).toFixed(2) : '—'}</dd>
    <dt>Whole animals</dt><dd>${y.pctDead == null ? '—' : `${((y.pctDead ?? 0) + (y.pctLive ?? 0)).toFixed(1)}% <small>dead ${y.pctDead}%, live ${y.pctLive}%</small>`}</dd>
  </dl>${EVENTS[y.year] ? `<p class="dash-tip__event">${EVENTS[y.year]}</p>` : ''}`;

/** A column per year that highlights and shows the year's figures */
function yearHits(s: SVGSVGElement, W: number, H: number, onYear: (i: number | null) => void, content: (y: YearRow) => string = yearTip) {
  const { x, band } = yearScale(W);
  years.forEach((y, i) => {
    const r = svgEl('rect', { x: x(i) - band / 2, y: 0, width: band, height: H, class: 'dash-hit dash-col' });
    s.append(r);
    hoverable(r, () => { onYear(i); showTip(content(y), r.getBoundingClientRect(), [], ['right', 'left']); }, () => { onYear(null); hideTip(); });
  });
}
const dimYears = (marks: SVGElement[][], i: number | null) => marks.forEach((m, k) => m.forEach((n) => n.classList.toggle('is-dim', i !== null && k !== i)));

{
  const { el, body } = section('seizures', 'Seizures and tigers seized', 'Tiger range countries in orange / red, outside tiger range in white · 2000 – June 2025');
  widget(el, (W) => {
    const { x, band } = yearScale(W);
    const n = narrow();
    const rows = { s: [40, 160], o: [200, 236], t: [300, 440], p: [490, 540] };
    const H = 590;
    const s = svgBox(W, H);
    s.append(hatchDefs('dash-hatch-s', 4));
    guides(s, W, H, true);
    const marks: SVGElement[][] = years.map(() => []);
    const bw = band * 0.62;
    const lx = n ? 0 : x(0) - band * 1.4;
    const axis = (y0: number, y1: number, max: number, ticks: number[], title: string, sub: string) => {
      text(s, n ? 0 : x(0) - band * 0.8, y0 - 18, title, 'dash-row-title');
      if (!n) text(s, x(0) - band * 0.8 + title.length * 8.4 + 14, y0 - 18, sub, 'dash-small');
      const yy = (v: number) => y1 - (v / max) * (y1 - y0);
      for (const t of ticks) {
        s.append(svgEl('line', { x1: x(0) - band / 2, x2: x(years.length - 1) + band / 2, y1: yy(t), y2: yy(t), class: 'dash-grid' }));
        text(s, x(0) - band * 0.55, yy(t) + 4, String(t), 'dash-tick', 'end');
      }
      return yy;
    };
    void lx;
    // seizures
    const ys = axis(rows.s[0], rows.s[1], 150, [0, 50, 100, 150], 'Seizures', 'number per year');
    // tigers
    const yt = axis(rows.t[0], rows.t[1], 320, [0, 100, 200, 300], 'Tigers seized', 'whole animals + equivalent in parts, per year');
    // tigers per seizure
    const yp = axis(rows.p[0], rows.p[1], 2.5, [0, 2.5], 'Tigers per seizure', 'tigers seized ÷ seizures');
    text(s, n ? 0 : x(0) - band * 0.8, rows.o[0] - 14, '% of seizures outside tiger range', 'dash-row-title');
    const maxS = years.reduce((a, b) => (b.seizures > a.seizures ? b : a));
    const maxT = years.reduce((a, b) => ((b.tigersTotal ?? 0) > (a.tigersTotal ?? 0) ? b : a));
    const maxP = years.reduce((a, b) => ((b.tigersTotal ?? 0) / b.seizures > (a.tigersTotal ?? 0) / a.seizures ? b : a));
    const maxO = years.reduce((a, b) => ((b.pctOutside ?? 0) > (a.pctOutside ?? 0) ? b : a));
    years.forEach((y, i) => {
      const bx = x(i) - bw / 2;
      const m = marks[i];
      const bar = (y0: number, y1: number, fill: string, cls = 'dash-bar') => { const r = svgEl('rect', { x: bx, y: Math.min(y0, y1), width: bw, height: Math.abs(y1 - y0), fill, class: cls }); s.append(r); m.push(r); return r; };
      // seizures: range + outside
      if (y.seizuresRange != null) { bar(ys(0), ys(y.seizuresRange), C.seizures); bar(ys(y.seizuresRange), ys(y.seizures), '#fff'); }
      else bar(ys(0), ys(y.seizures), C.seizures, 'dash-bar is-partial');
      // % outside: tiles, darker = more
      if (y.pctOutside != null) {
        const t = Math.min(1, y.pctOutside / 40);
        const c = Math.round(205 - 170 * t);
        const r = svgEl('rect', { x: x(i) - band * 0.4, y: rows.o[0], width: band * 0.8, height: rows.o[1] - rows.o[0], fill: `rgb(${c},${c},${c})`, class: 'dash-tile' });
        s.append(r); m.push(r);
        if (!n) { const tt = text(s, x(i), rows.o[0] + 22, String(Math.round(y.pctOutside)), c < 110 ? 'dash-tile-n is-light' : 'dash-tile-n', 'middle'); m.push(tt); }
      }
      // tigers: range + outside
      if (y.tigersTotal != null) {
        if (y.tigersRange != null) { bar(yt(0), yt(y.tigersRange), C.tigers); bar(yt(y.tigersRange), yt(y.tigersTotal), '#fff'); }
        else bar(yt(0), yt(y.tigersTotal), 'none', 'dash-bar is-partial');
        const c = svgEl('circle', { cx: x(i), cy: yp(y.tigersTotal / y.seizures), r: n ? 2.5 : 4, class: y.partial ? 'dash-dot is-partial' : 'dash-dot' });
        s.append(c); m.push(c);
      }
    });
    const label = (xx: number, yy: number, t: string, cls = 'dash-value') => text(s, xx, yy, t, cls, 'middle');
    label(x(years.indexOf(maxS)), ys(maxS.seizures) - 6, String(maxS.seizures));
    label(x(years.length - 1), ys(years[years.length - 1].seizures) - 6, String(years[years.length - 1].seizures));
    label(x(years.indexOf(maxT)), yt(maxT.tigersTotal ?? 0) - 6, String(maxT.tigersTotal));
    label(x(years.length - 1), yt(years[years.length - 1].tigersTotal ?? 0) - 6, String(years[years.length - 1].tigersTotal));
    text(s, x(years.indexOf(maxP)) + 8, yp((maxP.tigersTotal ?? 0) / maxP.seizures) + 4, ((maxP.tigersTotal ?? 0) / maxP.seizures).toFixed(2), 'dash-value');
    if (!n) {
      text(s, x(years.indexOf(maxO)), rows.o[1] + 16, `${maxO.year}: ${maxO.seizuresOutside} seizures outside range, ${maxO.pctOutside}%`, 'dash-ann', 'middle');
      text(s, x(years.indexOf(maxT)) - band * 0.7, yt(maxT.tigersTotal ?? 0) + 4, `${maxT.year}: ${EVENT_SHORT[maxT.year] ?? ''}`, 'dash-ann is-red', 'end');
    }
    yearHits(s, W, H, (i) => dimYears(marks, i));
    const legend = html('ul', 'dash-legend', `<li><i style="--c:${C.seizures}"></i>seizures, tiger range</li><li><i style="--c:${C.tigers}"></i>tigers, tiger range</li><li><i style="--c:#fff"></i>outside tiger range</li><li><i class="is-dashed"></i>2025 = Jan–Jun; tigers: range / outside split not available</li>`);
    body.replaceChildren(s, legend);
  });
}

// ================================================================== 5 · whole animals
{
  const { el, body } = section('whole', 'Whole animals', 'Seizures that included a dead or a live tiger, as % of all seizures that year');
  widget(el, (W) => {
    const { x, band } = yearScale(W);
    const H = 210, y0 = 40, y1 = 180;
    const s = svgBox(W, H);
    guides(s, W, H);
    const yy = (v: number) => y1 - (v / 50) * (y1 - y0);
    for (const t of [0, 25, 50]) {
      s.append(svgEl('line', { x1: x(0) - band / 2, x2: x(years.length - 1) + band / 2, y1: yy(t), y2: yy(t), class: 'dash-grid' }));
      text(s, x(0) - band * 0.55, yy(t) + 4, `${t}%`, 'dash-tick', 'end');
    }
    const marks: SVGElement[][] = years.map(() => []);
    const bw = band * 0.62;
    let best = years[0];
    years.forEach((y, i) => {
      if (y.pctDead == null) return;
      const d = y.pctDead, l = y.pctLive ?? 0;
      if (d + l > (best.pctDead ?? 0) + (best.pctLive ?? 0)) best = y;
      const a = svgEl('rect', { x: x(i) - bw / 2, y: yy(d), width: bw, height: yy(0) - yy(d), fill: '#111', class: y.partial ? 'dash-bar is-partial' : 'dash-bar' });
      const b = svgEl('rect', { x: x(i) - bw / 2, y: yy(d + l), width: bw, height: yy(d) - yy(d + l), fill: C.live, class: y.partial ? 'dash-bar is-partial' : 'dash-bar' });
      s.append(a, b);
      marks[i].push(a, b);
    });
    const bi = years.indexOf(best), tot = (best.pctDead ?? 0) + (best.pctLive ?? 0);
    s.append(svgEl('rect', { x: x(bi) - bw / 2 - 3, y: yy(tot) - 3, width: bw + 6, height: yy(0) - yy(tot) + 3, class: 'dash-box' }));
    text(s, x(bi), yy(tot) - 10, `${tot.toFixed(1)}%`, 'dash-value', 'middle');
    if (!narrow()) text(s, x(bi) + bw, yy(tot) + 12, `${best.year}: highest share — dead ${best.pctDead}% + live ${best.pctLive}%`, 'dash-ann');
    yearHits(s, W, H, (i) => dimYears(marks, i));
    const legend = html('ul', 'dash-legend', `<li><i style="--c:#111"></i>dead tigers</li><li><i style="--c:${C.live}"></i>live tigers</li><li><i class="is-dashed"></i>2025 = January–June (dashed)</li>`);
    body.replaceChildren(s, legend);
  });
}

// ================================================================== 6 · what is trafficked
{
  const { el, body } = section('trafficked', 'What is trafficked', 'Each shape = what the seizures were made of: share (%) of each part among all part appearances in the period. Square-root radial scale.');
  const first = periods[0], last = periods[periods.length - 1];
  const r0 = (n: number) => Math.round(n);
  const legend = html('ul', 'dash-periods', periods.map((p, i) => `<li data-i="${i}"><i style="--c:${PERIOD_COLORS[i]}"></i><b>${p.label}${i === periods.length - 1 ? '*' : ''}</b><small>${fmt.format(p.total)} appearances</small></li>`).join('')
    + `<li class="dash-periods__years"><span style="background:linear-gradient(90deg, ${YEAR_STOPS.join(',')})"></span><small>2000 → 2025 · thin lines: one per year</small></li>`);
  const big = html('div', 'dash-radar');
  const notes = html('ul', 'dash-readings', `
    <li style="--c:#e2560c"><b>skins fall from ${r0(val(first, 'Skins'))}% to ${r0(val(last, 'Skins'))}%</b><em>the trophy loses weight</em></li>
    <li style="--c:#741505"><b>claws rise ${r0(val(first, 'Claws'))}% → ${r0(val(last, 'Claws'))}% and teeth ${r0(val(first, 'Teeth'))}% → ${r0(val(last, 'Teeth'))}%</b><em>“the tiger is sold in pieces”</em></li>
    <li style="--c:#111"><b>live tigers rise ${r0(val(first, 'Live_tigers'))}% → ${r0(val(last, 'Live_tigers'))}%</b><em>“farms and pets”</em></li>`);
  const smallHead = html('div', 'dash-sub', '<h3>The same shapes, one by one</h3><p>Number in the circle = total part appearances in the period</p>');
  const small = html('ul', 'dash-radars');
  body.append(legend, big, notes, smallHead, small, html('p', 'dash-note', '* A seizure with several parts counts in each category; 2025 = January–June.'));
  let pinned: number | null = null;
  let focus: (i: number | null) => void = () => {};
  const lis = Array.from(legend.querySelectorAll<HTMLElement>('li[data-i]'));
  lis.forEach((li) => {
    const i = Number(li.dataset.i);
    li.setAttribute('tabindex', '0');
    li.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') focus(i); });
    li.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') focus(pinned); });
    li.addEventListener('click', (e) => { e.stopPropagation(); pinned = pinned === i ? null : i; focus(pinned); });
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); } });
  });
  widget(el, (W) => {
    const S = Math.min(W, 900);
    const R = S * (narrow() ? 0.3 : 0.32);
    const s = svgBox(S, S * (narrow() ? 0.92 : 0.86), 'radar');
    const g = svgEl('g', { transform: `translate(${S / 2} ${S * (narrow() ? 0.46 : 0.43)})` });
    s.append(g);
    const d = drawRadar(g, R);
    big.replaceChildren(s);
    const yearOf = d.yearLines.map((p) => Number(p.getAttribute('data-year')));
    void yearOf;
    // small multiples
    small.innerHTML = '';
    const smalls = periods.map((p, i) => {
      const r = narrow() ? 46 : 62;
      const li = html('li', 'dash-radars__item');
      li.dataset.i = String(i);
      const ss = svgBox(r * 2 + 20, r * 2 + 20, 'radar');
      const sg = svgEl('g', { transform: `translate(${r + 10} ${r + 14})` });
      ss.append(sg);
      drawRadar(sg, r, { labels: false, yearLines: false, only: i });
      const top = text(sg, 0, -r * 0.08 - Math.sqrt(val(p, 'Skins') / 55) * r - 4, `skins ${r0(val(p, 'Skins'))}%`, 'dash-radars__skins', 'middle');
      void top;
      li.append(ss);
      li.insertAdjacentHTML('beforeend', `<b>${p.label}${i === periods.length - 1 ? '*' : ''}</b><small>claws + teeth ${r0(val(p, 'Claws') + val(p, 'Teeth'))}% · live ${r0(val(p, 'Live_tigers'))}%</small><span class="dash-radars__n" style="--c:${PERIOD_COLORS[i]}">${p.total}</span>`);
      small.append(li);
      li.setAttribute('tabindex', '0');
      li.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') focus(i); });
      li.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') focus(pinned); });
      li.addEventListener('click', (e) => { e.stopPropagation(); pinned = pinned === i ? null : i; focus(pinned); });
      return li;
    });
    focus = (i) => {
      el.classList.toggle('has-focus', i !== null);
      lis.forEach((li, kk) => { li.classList.toggle('is-on', kk === i); li.classList.toggle('is-pinned', kk === pinned); });
      smalls.forEach((li, kk) => li.classList.toggle('is-on', kk === i));
      d.shapes.forEach((sh, kk) => { sh.classList.toggle('is-dim', i !== null && kk !== i); sh.classList.toggle('is-on', kk === i); if (kk === i) sh.parentNode!.append(sh); });
      d.yearLines.forEach((p, kk) => {
        const mine = i !== null && periodOf(2000 + kk) === i;
        p.classList.toggle('is-dim', i !== null && !mine);
        p.classList.toggle('is-mine', mine);
      });
    };
    focus(pinned);
  });
  void AXES;
}

// ================================================================== 7 · trophy vs amulet
{
  const { el, body } = section('trophy', 'Trophy vs amulet', 'Skins + bones vs claws + teeth · % of part records per year');
  widget(el, (W) => {
    const { x, band } = yearScale(W);
    const H = 230, y0 = 30, y1 = 200;
    const s = svgBox(W, H);
    guides(s, W, H);
    const yy = (v: number) => y1 - (v / 80) * (y1 - y0);
    for (const t of [0, 20, 40, 60, 80]) {
      s.append(svgEl('line', { x1: x(0) - band / 2, x2: x(years.length - 1) + band / 2, y1: yy(t), y2: yy(t), class: 'dash-grid' }));
      text(s, x(0) - band * 0.55, yy(t) + 4, `${t}%`, 'dash-tick', 'end');
    }
    const marks: SVGElement[][] = years.map(() => []);
    const rr = narrow() ? 3 : 6;
    years.forEach((y, i) => {
      if (y.pctTrophy == null || y.pctAmulet == null) return;
      const cls = y.partial ? ' is-partial' : '';
      const l = svgEl('line', { x1: x(i), x2: x(i), y1: yy(y.pctTrophy), y2: yy(y.pctAmulet), class: `dash-stem${cls}` });
      const a = svgEl('circle', { cx: x(i), cy: yy(y.pctTrophy), r: rr, fill: C.trophy, class: `dash-dot2${cls}` });
      const b = svgEl('circle', { cx: x(i), cy: yy(y.pctAmulet), r: rr, fill: C.amulet, class: `dash-dot2${cls}` });
      s.append(l, a, b);
      marks[i].push(l, a, b);
    });
    const f = years[0], z = years[years.length - 1];
    text(s, x(0) + 10, yy(f.pctTrophy ?? 0) + 4, `${Math.round(f.pctTrophy ?? 0)}%`, 'dash-value is-hl');
    text(s, x(0) + 10, yy(f.pctAmulet ?? 0) + 4, `${Math.round(f.pctAmulet ?? 0)}%`, 'dash-value is-hl');
    if (!narrow()) text(s, x(years.length - 1) + 10, yy(z.pctAmulet ?? 0) - 2, `${Math.round(z.pctAmulet ?? 0)}%`, 'dash-value is-hl');
    if (!narrow()) text(s, x(years.length - 1) + 10, yy(z.pctTrophy ?? 0) + 12, `${Math.round(z.pctTrophy ?? 0)}%`, 'dash-value is-hl');
    yearHits(s, W, H, (i) => dimYears(marks, i), (y) => `<strong>${y.year}${y.partial ? ' (Jan–Jun)' : ''}</strong>trophy (skins + bones) ${y.pctTrophy}%<br/>amulet (claws + teeth) ${y.pctAmulet}%<br/><small>${fmt.format(y.partTotal)} part records</small>`);
    const legend = html('ul', 'dash-legend', `<li><i class="is-dot" style="--c:${C.trophy}"></i>trophy: skins + bones</li><li><i class="is-dot" style="--c:${C.amulet}"></i>amulet: claws + teeth</li><li>2025 = January–June, only ${z.partTotal} part records (faded)</li>`);
    body.replaceChildren(s, legend);
  });
}

// ================================================================== 8 · people jailed
{
  const { el, body } = section('jailed', 'People jailed for tiger trafficking', 'Tiger range countries · 2000–2021 · by country');
  widget(el, (W) => {
    const { x, band } = yearScale(W);
    const H = 230, y0 = 40, y1 = 200;
    const s = svgBox(W, H);
    guides(s, W, H);
    const yy = (v: number) => y1 - (v / 60) * (y1 - y0);
    for (const t of [0, 20, 40, 60]) {
      s.append(svgEl('line', { x1: x(0) - band / 2, x2: x(years.length - 1) + band / 2, y1: yy(t), y2: yy(t), class: 'dash-grid' }));
      text(s, x(0) - band * 0.55, yy(t) + 4, String(t), 'dash-tick', 'end');
    }
    const marks: SVGElement[][] = years.map(() => []);
    const bw = band * 0.62;
    jailedRows.forEach((r) => {
      const i = years.findIndex((y) => y.year === r.year);
      let acc = 0;
      r.by.forEach((n, c) => {
        if (!n) return;
        const rect = svgEl('rect', { x: x(i) - bw / 2, y: yy(acc + n), width: bw, height: yy(acc) - yy(acc + n), fill: COUNTRIES[c].color, class: 'dash-bar' });
        s.append(rect);
        marks[i].push(rect);
        acc += n;
      });
      if (!narrow() || r.total >= 50) marks[i].push(text(s, x(i), yy(r.total) - 5, String(r.total), 'dash-value', 'middle'));
    });
    if (!narrow()) for (const year of [2007, 2014]) {
      const r = jailedRows.find((q) => q.year === year)!;
      const i = years.findIndex((y) => y.year === year);
      text(s, x(i) + bw, yy(r.total) + 6, peakNote(year), 'dash-ann');
    }
    const i22 = years.findIndex((y) => y.year === 2022);
    s.append(svgEl('rect', { x: x(i22) - band / 2 + 3, y: yy(22), width: band * 4 - 6, height: yy(0) - yy(22), class: 'dash-nodata' }));
    text(s, x(i22) + band * 1.5, yy(11) + 4, narrow() ? 'no data' : 'no data 2022–2025', 'dash-nodata-label', 'middle');
    yearHits(s, W, H, (i) => dimYears(marks, i), (y) => {
      const r = jailedRows.find((q) => q.year === y.year);
      if (!r) return `<strong>${y.year}</strong>no data for 2022–2025`;
      return `<strong>${r.year}</strong>${r.total} people jailed${r.total ? '<br/>' + COUNTRIES.map((c, kk) => (r.by[kk] ? `${c.label} ${r.by[kk]}` : '')).filter(Boolean).join(' · ') : ''}`;
    });
    const legend = html('ul', 'dash-legend', COUNTRIES.map((c, kk) => `<li><i style="--c:${c.color}"></i>${c.label} <b>${jailedTotals[kk]}</b></li>`).join('') + `<li class="is-teal"><b>Total: ${jailedGrand} people</b></li>`);
    body.replaceChildren(s, legend);
  });
}

// ================================================================== 9 · where? seizures by country
{
  const { el, body } = section('where', 'Where? Seizures by country, 2020 – June 2025', 'Each thread = one country’s seizures in one year (width = seizures). Threads land on a tile map of the tiger range countries.');
  const card = html('div', 'seizures__card dash-hexcard');
  card.hidden = true;
  document.body.append(card);
  widget(el, () => {
    const box = narrow() ? { x: 430, y: 40, w: 820, h: 790 } : { x: 140, y: 20, w: 1300, h: 850 };
    const s = svgEl('svg', { viewBox: `${box.x} ${box.y} ${box.w} ${box.h}`, class: 'dash-svg dash-hexmap' });
    const g = svgEl('g');
    s.append(g);
    body.replaceChildren(s);
    el.classList.toggle('is-narrow', narrow());
    drawHexmap(g, card, el);
  });
}

// ================================================================== 10 · where the tiger still lives
{
  const { el, body } = section('map', 'Where the tiger still lives — and where it is gone', 'Wild tigers 2023 (Global Tiger Forum); seizures and tigers seized 2000 – June 2025 (TRAFFIC).');
  body.innerHTML = `
    <div class="dash-map">
      <aside class="dash-map__how">
        <h3 class="display">How to read</h3>
        <ul>
          <li><i style="--c:#111"></i>tiger range, wild tigers left</li>
          <li><i style="--c:#9e220a"></i>tiger range, extinct in the wild</li>
          <li><i class="is-outside"></i>outside the tiger range</li>
          <li><i class="is-dot" style="--c:#24520f"></i>wild tigers 2023 (area ∝ number)</li>
        </ul>
        <h3 class="display">Hover or tap</h3>
        <p>a country to see its figures in the card.</p>
      </aside>
      <div class="map dash-map__map">
        <div class="map__pan" tabindex="-1"></div>
        <div class="map-panel">
          <aside class="map-card" aria-live="polite">
            <button class="map-card__close" type="button" aria-label="Close country card"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg></button>
            <h3 class="map-card__title">INDIA</h3>
            <div class="map-card__body"></div>
          </aside>
          <aside class="map-legend" hidden><button class="map-legend__toggle" type="button"></button></aside>
        </div>
      </div>
    </div>
    <p class="dash-note">Mercator projection. Dots mark where each country’s tigers live. Country cards: seizures January 2000 – June 2025 (TRAFFIC); wild tigers 2023 (Global Tiger Forum).</p>`;
  createMap(body.querySelector<HTMLElement>('.map')!);
}

// ------------------------------------------------------------------ footer
root.append(html('footer', 'dash-foot', 'Data: TRAFFIC, <em>Skin and Bones</em> (2022, 2025); Global Tiger Forum (2023). <a href="./about.html">About the data</a>'));

// ------------------------------------------------------------------ render, resize, appear
let lastW = 0;
function renderAll() {
  const W = root.clientWidth;
  if (W === lastW) return;
  lastW = W;
  for (const w of widgets) w.render(W);
}
renderAll();
let t = 0;
window.addEventListener('resize', () => { clearTimeout(t); t = window.setTimeout(renderAll, 150); });

// each section builds in once, the first time it comes into view
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -12% 0px' });
document.querySelectorAll('.dash-sec, .dash-hero').forEach((s) => io.observe(s));
void Object.keys;
