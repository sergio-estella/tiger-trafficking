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
        <h2 class="years__title" id="years-title">Year by year: seizures rose, tigers seized peaked in 2016</h2>
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
    </div>`;
  const stage = section.querySelector<HTMLElement>('.years__stage')!;
  const head = section.querySelector<HTMLElement>('.years__head')!;
  const svg = section.querySelector<SVGSVGElement>('.years__svg')!;
  const tip = section.querySelector<HTMLElement>('.years__tip')!;

  let state: StateKey = 'seizures';
  let explorable = false;
  const bars: { g: SVGGElement; b: SVGRectElement; t: SVGRectElement; x: number; w: number }[] = [];
  let geom = { x0: 0, x1: 0, y0: 0, y1: 0, band: 0 };
  const layers: Record<StateKey, SVGGElement> = {} as Record<StateKey, SVGGElement>;
  let strip: SVGGElement, events: SVGGElement, axisX: SVGGElement;

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
    const cx = geom.x0 + geom.band * (i + 0.5);
    tip.style.left = `${Math.min(vw() - tip.offsetWidth - 10, Math.max(10, cx - tip.offsetWidth / 2))}px`;
    tip.style.top = `${geom.y0 - 4}px`;
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
    const scatter = bars.map((_, i) => ({
      x: (((i * 73) % 21) - 10) * vw() * 0.035, y: (((i * 41) % 17) - 8) * vh() * 0.06, r: (i % 2 ? 1 : -1) * (15 + ((i * 29) % 60)),
    }));
    const bs = bars.map((b) => b.b), ts = bars.map((b) => b.t);
    // Scatter written by hand on each column group: no transform-origin bookkeeping,
    // so the columns always land exactly where they were (12 drawings per second)
    const fly = { p: 0, k: 1, z: 1 };
    const renderFly = () => {
      const p = Math.round(fly.p * FPS) / FPS;
      bars.forEach((c, i) => {
        if (p === 0 && fly.z === 1) { c.g.removeAttribute('transform'); return; }
        const cx = c.x + c.w / 2, cy = geom.y1;
        const f = scatter[i];
        c.g.setAttribute('transform', `translate(${f.x * fly.k * p} ${f.y * fly.k * p}) rotate(${f.r * fly.k * p} ${cx} ${cy}) translate(${cx} ${cy}) scale(${1 + (fly.z - 1) * p}) translate(${-cx} ${-cy})`);
      });
    };
    for (const s of ORDER) gsap.set(layers[s], { opacity: 0 });
    tl = gsap.timeline({ paused: true });
    tl.addLabel('hidden')
      .from(head, { y: 40, opacity: 0, duration: 0.5 * D, ease: 'power2.out' }, 0)
      .fromTo(layers.seizures, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.2 * D)
      .from([axisX, events], { opacity: 0, duration: 0.3 }, 0.2 * D)
      // 42: bars rise, year by year
      .from(bs, { attr: { y: geom.y1, height: 0 }, duration: 0.35 * D, stagger: 0.03, ease: 'steps(4)' }, 0.3 * D)
      .from(ts, { attr: { y: ((i: number) => barAttrs('seizures', i).b.y) as unknown as number, height: 0 }, duration: 0.3 * D, stagger: 0.03, ease: 'steps(3)' }, 0.5 * D)
      .from(strip, { opacity: 0, y: 20, duration: 0.4 * D }, 1.2 * D)
      .addLabel('seizures')
      // 43: the same bars become tigers seized
      .call(() => { state = 'tigers'; showTip(null); }, [], 'seizures+=0.01')
      .to(strip, { opacity: 0, duration: 0.3 * D }, 'seizures+=0.01')
      .to(layers.seizures, { opacity: 0, duration: 0.25 }, 'seizures+=0.01')
      .to(bs, { attr: toAttrs('tigers')('b') as unknown as gsap.AttrVars, duration: 0.7 * D, ease: `steps(${Math.round(0.7 * FPS)})`, stagger: 0.01 }, 'seizures+=0.05')
      .to(ts, { attr: toAttrs('tigers')('t') as unknown as gsap.AttrVars, duration: 0.7 * D, ease: `steps(${Math.round(0.7 * FPS)})`, stagger: 0.01 }, 'seizures+=0.05')
      .to(layers.tigers, { opacity: 1, duration: 0.3 }, 'seizures+=0.5')
      .addLabel('tigers')
      // 44 → 46: the bars scatter and land as whole animals
      .call(() => { state = 'whole'; showTip(null); }, [], 'tigers+=0.01')
      .to(layers.tigers, { opacity: 0, duration: 0.25 }, 'tigers+=0.01')
      .fromTo(fly, { p: 0, k: 1, z: 1 }, { p: 1, duration: 0.5 * D, ease: 'none', onUpdate: renderFly }, 'tigers+=0.05')
      .set(bs, { attr: toAttrs('whole')('b') as unknown as gsap.AttrVars }, `tigers+=${0.55 * D}`)
      .set(ts, { attr: toAttrs('whole')('t') as unknown as gsap.AttrVars }, `tigers+=${0.55 * D}`)
      .to(fly, { p: 0, duration: 0.6 * D, ease: 'none', onUpdate: renderFly }, `tigers+=${0.6 * D}`)
      .to(layers.whole, { opacity: 1, duration: 0.3 }, `tigers+=${1.1 * D}`)
      .addLabel('whole')
      // 47 → 49: scatter, zoom, out
      .call(() => showTip(null), [], 'whole+=0.01')
      .fromTo(fly, { p: 0, k: 3, z: 2.2 }, { p: 1, duration: 0.9 * D, ease: 'none', onUpdate: renderFly, immediateRender: false }, 'whole+=0.01')
      .to([layers.whole, axisX, events, head], { opacity: 0, duration: 0.5 * D }, 'whole+=0.01')
      .to([...bs, ...ts], { opacity: 0, duration: 0.3 * D }, `whole+=${0.75 * D}`)
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
