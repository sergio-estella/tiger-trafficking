/**
 * 03 · "Year by year" (frames 42–49): one bar per year, three states.
 *
 *  hidden → seizures   bars rise: seizures per year (tiger range + outside),
 *                      with the strip of % of seizures outside the range (42)
 *  seizures → tigers   the same bars become tigers seized per year (43)
 *  tigers → whole      the bars scatter and land as the share of seizures with
 *                      whole animals, dead + live (44 → 46)
 *  whole → out         they scatter and the page carries on (47 → 49)
 *
 * Each state holds; hover / tap a year to read its values.
 */
import { gsap } from 'gsap';
import { registerScene } from '../engine';
import { placeTip } from '../tip';
import { EVENTS, YEAR_COLORS as C, years } from '../data/series';
import { hatchDefs, svgEl } from '../charts/faces';

const fmt = new Intl.NumberFormat('en-GB');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const vw = () => window.innerWidth;
const vh = () => window.innerHeight;
const portrait = () => vh() > vw();

type StateKey = 'seizures' | 'tigers' | 'whole';
interface StateDef {
  title: string; note: string; max: number; ticks: number[]; unit: string;
  bottom: (y: (typeof years)[number]) => number | null; top: (y: (typeof years)[number]) => number | null;
  bottomFill: string; topFill: string; labels: number[];
}
const STATES: Record<StateKey, StateDef> = {
  seizures: {
    title: 'Seizures per year', note: '', max: 150, ticks: [0, 50, 100, 150], unit: '',
    bottom: (y) => y.seizuresRange ?? y.seizures, top: (y) => y.seizuresOutside ?? 0,
    bottomFill: C.seizures, topFill: C.outside, labels: [2001, 2019, 2025],
  },
  tigers: {
    title: 'Tigers seized per year', note: 'whole animals + tigers estimated from parts', max: 350, ticks: [0, 100, 200, 300], unit: '',
    bottom: (y) => y.tigersRange ?? y.tigersTotal, top: (y) => y.tigersOutside ?? 0,
    bottomFill: C.tigers, topFill: C.outside, labels: [2016, 2025],
  },
  whole: {
    title: 'Seizures with whole animals', note: '% of seizures that year', max: 50, ticks: [0, 25, 50], unit: '%',
    bottom: (y) => y.pctDead, top: (y) => y.pctLive,
    bottomFill: C.dead, topFill: 'url(#years-hatch)', labels: [2017],
  },
};
const ORDER: StateKey[] = ['seizures', 'tigers', 'whole'];

export function buildYears(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'scene years';
  section.dataset.frames = '42–49';
  section.style.height = '410vh';
  section.setAttribute('aria-labelledby', 'years-title');
  section.innerHTML = `
    <div class="scene__stage years__stage">
      <header class="years__head">
        <h2 class="years__title display" id="years-title">Year by year</h2>
        <p class="years__lede">Seizures climbed from 58 in 2000 to a peak of 141 in 2019. Tigers seized peaked at 320 in 2016. Every chart below shares the same year positions.</p>
        <ul class="years__legend">
          <li><span style="--c:${C.seizures}"></span>seizures in tiger range countries</li>
          <li><span style="--c:${C.tigers}"></span>tigers seized in tiger range countries</li>
          <li><span class="is-outside"></span>outside the tiger range</li>
          <li><span style="--c:${C.dead}"></span>dead tigers</li>
          <li><span class="is-hatch"></span>live tigers</li>
        </ul>
      </header>
      <svg class="years__svg" aria-hidden="true"></svg>
      <div class="years__tip" hidden></div>
      <svg class="years__wipe" aria-hidden="true"><path fill-rule="evenodd" /></svg>
    </div>`;
  const stage = section.querySelector<HTMLElement>('.years__stage')!;
  const head = section.querySelector<HTMLElement>('.years__head')!;
  const svg = section.querySelector<SVGSVGElement>('.years__svg')!;
  const tip = section.querySelector<HTMLElement>('.years__tip')!;
  // the transition object: a circle that grows from the centre and covers the chart,
  // then opens from its own centre on the next state (drawn as a ring, even-odd)
  const wipe = section.querySelector<SVGPathElement>('.years__wipe path')!;

  let state: StateKey = 'seizures';
  let explorable = false;
  const bars: { g: SVGGElement; b: SVGRectElement; t: SVGRectElement; x: number; w: number }[] = [];
  let geom = { x0: 0, x1: 0, y0: 0, y1: 0, band: 0 };
  const layers: Record<StateKey, SVGGElement> = {} as Record<StateKey, SVGGElement>;
  let strip: SVGGElement, events: SVGGElement, axisX: SVGGElement, barsGroup: SVGGElement;

  const yScale = (s: StateKey, v: number) => geom.y1 - (Math.min(v, STATES[s].max) / STATES[s].max) * (geom.y1 - geom.y0);
  const barAttrs = (s: StateKey, i: number) => {
    const y = years[i], def = STATES[s];
    const b = def.bottom(y) ?? 0, t = def.top(y) ?? 0;
    const yb = yScale(s, b), yt = yScale(s, b + t);
    return { b: { y: yb, height: geom.y1 - yb, fill: def.bottomFill }, t: { y: yt, height: yb - yt, fill: def.topFill } };
  };

  function layout() {
    svg.innerHTML = '';
    bars.length = 0;
    const W = vw(), H = vh();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.append(hatchDefs('years-hatch', 5));
    // Fixed proportions (the scene is laid out before it is in the page, so nothing is measured)
    geom = {
      x0: portrait() ? W * 0.1 : W * 0.11 + 40, x1: portrait() ? W * 0.97 : W * 0.88,
      y0: portrait() ? H * 0.47 : H * 0.47, y1: portrait() ? H * 0.74 : H * 0.7, band: 0,
    };
    geom.band = (geom.x1 - geom.x0) / years.length;

    // Event columns (2010, 2016, 2020)
    events = svgEl('g', { class: 'years__events' });
    svg.append(events);
    years.forEach((y, i) => {
      if (!EVENTS[y.year]) return;
      const x = geom.x0 + geom.band * i;
      events.append(svgEl('rect', { x, y: geom.y0 - 6, width: geom.band, height: geom.y1 - geom.y0 + 6, class: 'years__event' }));
      if (!portrait()) {
        const t = svgEl('text', { x: x + geom.band / 2, y: geom.y0 - 12, 'text-anchor': 'middle', class: 'years__event-label' });
        t.textContent = EVENTS[y.year].split(',')[0].replace(' (TX2 goal)', '');
        events.append(t);
      }
    });

    // One axis + title layer per state (faded in and out)
    for (const s of ORDER) {
      const def = STATES[s];
      const g = svgEl('g', { class: 'years__layer' });
      // title and its note in one line (the note follows the title, whatever its width)
      const title = svgEl('text', { x: Math.max(16, geom.x0 - 40), y: geom.y0 - 40, class: 'years__chart-title' });
      title.textContent = def.title;
      if (def.note && !portrait()) {
        const n = svgEl('tspan', { dx: 14, class: 'years__chart-note' });
        n.textContent = def.note;
        title.append(n);
      }
      g.append(title);
      for (const v of def.ticks) {
        const y = yScale(s, v);
        g.append(svgEl('line', { x1: geom.x0 - 8, x2: geom.x1, y1: y, y2: y, class: v === 0 ? 'years__base' : 'years__grid' }));
        const t = svgEl('text', { x: geom.x0 - 14, y: y + 4, 'text-anchor': 'end', class: 'years__tick' });
        t.textContent = `${v}${def.unit}`;
        g.append(t);
      }
      for (const yr of def.labels) {
        const i = years.findIndex((y) => y.year === yr);
        const y = years[i];
        const v = s === 'whole' ? (y.pctDead ?? 0) + (y.pctLive ?? 0) : (def.bottom(y) ?? 0) + (def.top(y) ?? 0);
        const t = svgEl('text', { x: geom.x0 + geom.band * (i + 0.5), y: yScale(s, v) - 6, 'text-anchor': 'middle', class: 'years__value' });
        t.textContent = s === 'whole' ? `${v.toFixed(1)}%` : fmt.format(v);
        g.append(t);
      }
      svg.append(g);
      layers[s] = g;
    }

    // Bars (two per year: bottom + top), reused by every state
    const barsG = svgEl('g', { class: 'years__bars' });
    svg.append(barsG);
    barsGroup = barsG;
    years.forEach((y, i) => {
      const w = geom.band * 0.62, x = geom.x0 + geom.band * i + (geom.band - w) / 2;
      const b = svgEl('rect', { x, width: w, class: 'years__bar' });
      const t = svgEl('rect', { x, width: w, class: 'years__bar years__bar--top' });
      if (y.partial) { b.classList.add('is-partial'); t.classList.add('is-partial'); }
      const g = svgEl('g', { class: 'years__col' }); // scattered as a unit (transform set by hand)
      g.append(b, t);
      barsG.append(g);
      bars.push({ g, b, t, x, w });
      const a = barAttrs(state, i);
      for (const k of ['y', 'height', 'fill'] as const) { b.setAttribute(k, String(a.b[k])); t.setAttribute(k, String(a.t[k])); }
    });

    // Year axis
    axisX = svgEl('g', { class: 'years__axis' });
    years.forEach((y, i) => {
      const t = svgEl('text', { x: geom.x0 + geom.band * (i + 0.5), y: geom.y1 + 18, 'text-anchor': 'middle', class: 'years__year' });
      t.textContent = i === 0 ? '2000' : y.partial ? `${y.year}*` : `'${String(y.year).slice(2)}`;
      if (portrait() && i % 2 && !y.partial) t.textContent = '';
      axisX.append(t);
    });
    svg.append(axisX);

    // % of seizures outside the range (state 1 only)
    strip = svgEl('g', { class: 'years__strip' });
    const sy = geom.y1 + (portrait() ? 46 : 60);
    const st = svgEl('text', { x: Math.max(16, geom.x0 - 40), y: sy - 10, class: 'years__chart-title years__chart-title--small' });
    st.textContent = '% of seizures outside the tiger range';
    strip.append(st);
    const cellH = portrait() ? 16 : 22;
    years.forEach((y, i) => {
      if (y.pctOutside == null) return;
      const x = geom.x0 + geom.band * i + 1;
      strip.append(svgEl('rect', { x, y: sy, width: geom.band - 2, height: cellH, fill: '#111', 'fill-opacity': Math.min(0.9, 0.1 + y.pctOutside / 45), stroke: '#111', 'stroke-width': 0.6 }));
      if (!portrait() || geom.band > 16) {
        const t = svgEl('text', { x: x + (geom.band - 2) / 2, y: sy + cellH * 0.7, 'text-anchor': 'middle', class: 'years__cell', fill: y.pctOutside > 22 ? '#fff' : '#111' });
        t.textContent = String(Math.round(y.pctOutside));
        strip.append(t);
      }
    });
    const peak = years.reduce((a, b) => ((b.pctOutside ?? 0) > (a.pctOutside ?? 0) ? b : a));
    const ann = svgEl('text', { x: geom.x0 + geom.band * (years.indexOf(peak) + 0.5), y: sy + cellH + 20, 'text-anchor': 'middle', class: 'years__ann' });
    ann.textContent = `${peak.year}: ${peak.seizuresOutside} seizures outside the range — ${peak.pctOutside}%, the highest share`;
    strip.append(ann);
    svg.append(strip);

    // Hover / tap columns
    years.forEach((y, i) => {
      const hit = svgEl('rect', { x: geom.x0 + geom.band * i, y: geom.y0 - 6, width: geom.band, height: geom.y1 - geom.y0 + 30, class: 'years__hit', tabindex: 0, role: 'button', 'aria-label': String(y.year) });
      hit.addEventListener('pointerenter', (e) => { if (explorable && e.pointerType === 'mouse') showTip(i); });
      hit.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') showTip(null); });
      hit.addEventListener('click', () => { if (explorable) showTip(tipFor === i ? null : i); });
      svg.append(hit);
    });
  }

  let tipFor: number | null = null;
  function showTip(i: number | null) {
    tipFor = i;
    bars.forEach((b, k) => { const dim = i !== null && k !== i; b.b.style.opacity = b.t.style.opacity = dim ? '0.35' : ''; });
    if (i === null) { tip.hidden = true; return; }
    const y = years[i];
    const yr = `${y.year}${y.partial ? ' (Jan–Jun)' : ''}`;
    tip.innerHTML = state === 'seizures'
      ? `<strong>${yr}</strong> ${fmt.format(y.seizures)} seizures${y.seizuresRange != null ? ` · ${y.seizuresRange} in range, ${y.seizuresOutside} outside (${y.pctOutside}%)` : ''}`
      : state === 'tigers'
        ? `<strong>${yr}</strong> ${fmt.format(y.tigersTotal ?? 0)} tigers seized${y.tigersRange != null ? ` · ${y.tigersRange} in range, ${y.tigersOutside} outside` : ' · range / outside split n/a'}`
        : `<strong>${yr}</strong> ${((y.pctDead ?? 0) + (y.pctLive ?? 0)).toFixed(1)}% of seizures with whole animals · dead ${y.pctDead}%, live ${y.pctLive}%`;
    tip.hidden = false;
    // above the bar, never over it (nor over the legend)
    const r1 = bars[i].b.getBoundingClientRect(), r2 = bars[i].t.getBoundingClientRect();
    const rs = [r1, r2].filter((r) => r.width > 0 && r.height > 0);
    const top = Math.min(...rs.map((r) => r.top)), bottom = Math.max(...rs.map((r) => r.bottom));
    const left = Math.min(...rs.map((r) => r.left)), right = Math.max(...rs.map((r) => r.right));
    const anchor = rs.length ? new DOMRect(left, top, right - left, bottom - top) : new DOMRect(geom.x0 + geom.band * i, geom.y1 - 2, geom.band, 2);
    placeTip(tip, anchor, [head.getBoundingClientRect()], i < years.length / 2 ? ['above', 'right', 'left'] : ['above', 'left', 'right']);
  }

  // ---------------------------------------------------------------- timeline
  const FPS = 12;
  let tl = gsap.timeline({ paused: true });
  function build() {
    const progress = tl.progress();
    tl.kill();
    layout();
    const D = reduced ? 0.01 : 1;
    // per-bar attribute targets for a state (GSAP takes one function per attribute)
    const toAttrs = (s: StateKey) => (part: 'b' | 't') => ({
      y: (i: number) => barAttrs(s, i)[part].y,
      height: (i: number) => barAttrs(s, i)[part].height,
      fill: (i: number) => barAttrs(s, i)[part].fill,
    });
    const bs = bars.map((b) => b.b), ts = bars.map((b) => b.t);
    // Every bar is two pieces (bottom + top); each flies on its own path
    const pieces = bars.flatMap((c, i) => [c.b, c.t].map((el, k) => {
      const j = i * 2 + k;
      return {
        el, x: (((j * 73) % 23) - 11) * vw() * 0.032, y: (((j * 41) % 19) - 9) * vh() * 0.055,
        r: (j % 2 ? 1 : -1) * (20 + ((j * 29) % 70)),
      };
    }));
    // Written by hand (no transform-origin bookkeeping: the pieces land exactly), 12 drawings per second.
    // p: 0 = assembled, 1 = scattered; k: how far; z: camera zoom on the whole chart
    const fly = { p: 0, k: 1, z: 1 };
    const cx0 = (geom.x0 + geom.x1) / 2, cy0 = (geom.y0 + geom.y1) / 2;
    const renderFly = () => {
      const p = Math.round(fly.p * FPS) / FPS;
      for (const f of pieces) {
        if (p === 0) { f.el.removeAttribute('transform'); continue; }
        const x = Number(f.el.getAttribute('x')) + Number(f.el.getAttribute('width')) / 2;
        const y = Number(f.el.getAttribute('y')) + Number(f.el.getAttribute('height')) / 2;
        f.el.setAttribute('transform', `translate(${f.x * fly.k * p} ${f.y * fly.k * p}) rotate(${f.r * Math.min(fly.k, 2) * p} ${x} ${y})`);
      }
      const z = 1 + (fly.z - 1) * p;
      if (z === 1) barsGroup.removeAttribute('transform');
      else barsGroup.setAttribute('transform', `translate(${cx0} ${cy0}) scale(${z}) translate(${-cx0} ${-cy0})`);
    };
    const W = vw(), H = vh(), RMAX = Math.hypot(W, H) / 2 + 10;
    const wp = { o: 0, i: 0 };
    const circle = (r: number) => `M${W / 2 - r},${H / 2}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0Z`;
    const renderWipe = () => {
      const o = Math.round(wp.o * 6) / 6, n = Math.round(wp.i * 6) / 6; // 6 sizes each way: comic steps
      wipe.setAttribute('d', o <= 0 || n >= 1 ? '' : circle(o * RMAX) + (n > 0 ? circle(n * RMAX) : ''));
    };
    // close at `at`, swap the chart under the circle, open again
    const transition = (label: string, swap: (t: gsap.core.Timeline, pos: number) => void) => {
      const at = tl.labels[label] + 0.01;
      tl.fromTo(wp, { o: 0, i: 0 }, { o: 1, i: 0, duration: 0.4 * D, ease: 'power2.in', onUpdate: renderWipe, immediateRender: false }, at);
      swap(tl, at + 0.42 * D);
      tl.to(wp, { i: 1, duration: 0.45 * D, ease: 'power2.out', onUpdate: renderWipe }, at + 0.5 * D);
    };
    for (const s of ORDER) gsap.set(layers[s], { opacity: 0 });
    tl = gsap.timeline({ paused: true });
    tl.addLabel('hidden')
      .fromTo(head, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 * D, ease: 'power2.out' }, 0)
      .fromTo(layers.seizures, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.2 * D)
      .from([axisX, events], { opacity: 0, duration: 0.3 }, 0.2 * D)
      // 42: the bars come in from outside, in pieces, and the chart puts itself together
      .fromTo(fly, { p: 1, k: 3.2, z: 1 }, { p: 0, duration: 0.85 * D, ease: 'power3.out', onUpdate: renderFly, immediateRender: true }, 0.15 * D)
      .from(strip, { opacity: 0, y: 20, duration: 0.4 * D }, 1.0 * D)
      .addLabel('seizures');
    // 43: a circle closes over the chart; it opens on tigers seized
    tl.call(() => { state = 'tigers'; showTip(null); }, [], 'seizures+=0.01');
    transition('seizures', (t, at) => {
      t.set(strip, { opacity: 0 }, at)
        .set(layers.seizures, { opacity: 0 }, at)
        .set(bs, { attr: toAttrs('tigers')('b') as unknown as gsap.AttrVars }, at)
        .set(ts, { attr: toAttrs('tigers')('t') as unknown as gsap.AttrVars }, at)
        .set(layers.tigers, { opacity: 1 }, at);
    });
    tl.addLabel('tigers');
    // 44 → 46: again, onto seizures with whole animals
    tl.call(() => { state = 'whole'; showTip(null); }, [], 'tigers+=0.01');
    transition('tigers', (t, at) => {
      t.set(layers.tigers, { opacity: 0 }, at)
        .set(bs, { attr: toAttrs('whole')('b') as unknown as gsap.AttrVars }, at)
        .set(ts, { attr: toAttrs('whole')('t') as unknown as gsap.AttrVars }, at)
        .set(layers.whole, { opacity: 1 }, at);
    });
    tl.addLabel('whole')
      // 47 → 49: it blows apart — fast, and the camera rushes into the pieces (like the head)
      .call(() => showTip(null), [], 'whole+=0.01')
      .fromTo(fly, { p: 0, k: 0.8, z: 3.6 }, { p: 1, duration: 0.8 * D, ease: 'power2.out', onUpdate: renderFly, immediateRender: false }, 'whole+=0.01')
      .to([layers.whole, axisX, events, head], { opacity: 0, duration: 0.2 * D }, 'whole+=0.01')
      .to([...bs, ...ts], { opacity: 0, duration: 0.25 * D, ease: 'power2.in' }, `whole+=${0.6 * D}`)
      .addLabel('out');
    tl.progress(progress);
  }
  build();
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(build, 200); });

  registerScene({
    section, get tl() { return tl; }, labels: ['hidden', 'seizures', 'tigers', 'whole', 'out'], at: [-0.35, 0.9, 1.8, 2.7], cutBackFrom: 4, passAt: [3],
    onStep: (i) => {
      explorable = i >= 1 && i <= 3;
      state = ORDER[Math.max(0, Math.min(2, i - 1))];
      stage.classList.toggle('is-explorable', explorable);
      showTip(null);
    },
  } as Parameters<typeof registerScene>[0]);
  return section;
}
