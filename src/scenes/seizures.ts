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
import { placeTip } from '../tip';
import countriesCsv from '../data/data_countries.csv?raw';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FPS = 12;
const vw = () => window.innerWidth;
const vh = () => window.innerHeight;
const fmt = new Intl.NumberFormat('en-GB');

const YEARS = ['2020', '2021', '2022', '2023', '2024', '2025*'];
const YEAR_COLS = ['s2020', 's2021', 's2022', 's2023', 's2024', 's2025H1'];
// hexagon centres as drawn in frame 86 (1440 × 900)
const POS: Record<string, [number, number]> = {
  India: [507, 530], Bangladesh: [593, 530], Myanmar: [679, 530], Laos: [764, 530], 'Viet Nam': [850, 530],
  Nepal: [636, 456], Bhutan: [721, 456], China: [807, 456], Russia: [850, 382],
  Thailand: [722, 604], Cambodia: [807, 604], Malaysia: [679, 678], Indonesia: [722, 752],
};
// outline = country colour, as in "People jailed"
const OUTLINE: Record<string, string> = { India: '#e2560c', China: '#ffffff', Indonesia: '#6b3214', 'Viet Nam': '#9e220a', Nepal: '#6e5a96' };
const THREAD: Record<string, string> = { India: '#e2560c', China: '#d9cfa0', Indonesia: '#8a4a1c', 'Viet Nam': '#9e220a', Nepal: '#8a7ab0' };
const OTHER = '#8c8070';

const rows = parseCsv(countriesCsv);
const range = rows.filter((r) => POS[r.country]).map((r) => ({
  name: r.country,
  pos: POS[r.country],
  seizures: Number(r.seizures_2020_25 || 0),
  byYear: YEAR_COLS.map((c) => Number(r[c] || 0)),
  whole: r.pct_whole_animals_2020_25 === '' ? null : Number(r.pct_whole_animals_2020_25),
  wild: Number(r.wild_tigers_2023 || 0),
  outline: OUTLINE[r.country] ?? OTHER,
  thread: THREAD[r.country] ?? OTHER,
}));
const outside = rows.filter((r) => /non-range/.test(r.country)).map((r) => ({
  name: r.country.replace(' (non-range)', '').replace('United Kingdom', 'UK'),
  seizures: Number(r.seizures_2000_jun2025),
}));
const maxWild = Math.max(...range.map((c) => c.wild));
const yearTotals = YEAR_COLS.map((_, y) => range.reduce((s, c) => s + c.byYear[y], 0));

const hexPath = (r: number) => {
  const p = [];
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 2; p.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`); }
  return `M${p.join('L')}Z`;
};

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
    buildBlood();
  }

  // ---------------------------------------------------------------- explore
  let explorable = false;
  type Sel = { country?: number; year?: number } | null;
  let pinned: Sel = null;
  const same = (a: Sel, b: Sel) => !!a && !!b && a.country === b.country && a.year === b.year;
  function focus(sel: Sel) {
    stage.classList.toggle('has-focus', !!sel);
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
    g.addEventListener('pointerenter', (e) => { if (explorable && e.pointerType === 'mouse') focus(sel); });
    g.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') focus(pinned); });
    g.addEventListener('click', () => { if (!explorable) return; pinned = same(pinned, sel) ? null : sel; focus(pinned); });
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); g.dispatchEvent(new MouseEvent('click')); } });
  }

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
      .call(() => { pinned = null; focus(null); }, [], 'in+=0.01')
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
    onStep: (i) => { explorable = i === 1; stage.classList.toggle('is-explorable', explorable); if (!explorable) { pinned = null; focus(null); } },
  } as Parameters<typeof registerScene>[0]);
  return section;
}
