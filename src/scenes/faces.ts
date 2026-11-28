/**
 * 02 · "One face per year" (frames 22–28).
 *
 *  hidden → in   the head rises into place, the title slides in from the right,
 *                the 26 year heads pop in; HOLD · EXPLORE (frame 24):
 *                - hover / tap a cell: its legend appears (hexagon, part, seizures,
 *                  units) with a leader line to a yellow dot in the cell
 *                - hover / tap a year head: that year's mix is spelled out under it
 *  in → out      scroll: the head bursts into its pieces — the parts traffickers
 *                sell — with a zoom (25–27), then everything fades to the page
 *                colour and chapter 03 follows (28)
 *
 * Going back up from the burst cuts straight to the assembled head.
 */
import { gsap } from 'gsap';
import { registerScene } from '../engine';
import { PARTS, partByKey, partTotals, pct, years, type PartKey } from '../data/series';
import { HEAD_ASPECT, drawHead, hatchDefs, svgEl, voronoiHead, type Cell, type DrawnHead } from '../charts/faces';

const fmt = new Intl.NumberFormat('en-GB');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const vw = () => window.innerWidth;
const vh = () => window.innerHeight;
const portrait = () => vh() > vw();

function hexagon(color: string, hatch = false) {
  const fill = hatch ? 'url(#face-hatch-legend)' : color;
  return `<svg class="face-label__hex" viewBox="-10 -10 20 20" aria-hidden="true"><path d="M8.66,-5L8.66,5L0,10L-8.66,5L-8.66,-5L0,-10Z" fill="${fill}" stroke="#111" stroke-width="1.2"/></svg>`;
}

export function buildFaces(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'scene faces';
  section.dataset.frames = '22–28';
  section.style.height = '250vh';
  section.setAttribute('aria-labelledby', 'faces-title');
  section.innerHTML = `
    <div class="scene__stage faces__stage">
      <h2 class="faces__title display" id="faces-title">One face per year</h2>
      <p class="faces__lede">Each cell of the head is one kind of tiger part, sized by the seizures that contained it (2000 – June 2025).</p>
      <div class="faces__labels"></div>
      <svg class="faces__svg" aria-hidden="true"></svg>
      <p class="faces__note" hidden></p>
    </div>`;
  const stage = section.querySelector<HTMLElement>('.faces__stage')!;
  const title = section.querySelector<HTMLElement>('.faces__title')!;
  const svg = section.querySelector<SVGSVGElement>('.faces__svg')!;
  const labelsBox = section.querySelector<HTMLElement>('.faces__labels')!;
  const note = section.querySelector<HTMLElement>('.faces__note')!;

  // ---------------------------------------------------------------- layout
  let headW = 0, headX = 0, headY = 0;
  let cells: Cell[] = [];
  let paths = new Map<PartKey, SVGPathElement>();
  let big: DrawnHead;
  let riseG: SVGGElement, headG: SVGGElement, leader: SVGGElement, rowG: SVGGElement, yearLeader: SVGPolylineElement;
  const labelEls = new Map<PartKey, HTMLElement>();
  const yearEls: { g: SVGGElement; box: SVGRectElement; label: SVGTextElement; year: (typeof years)[number]; cx: number; bottom: number; top: number }[] = [];

  function layout() {
    svg.innerHTML = '';
    labelsBox.innerHTML = '';
    labelEls.clear();
    yearEls.length = 0;
    const W = vw(), H = vh();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.append(hatchDefs('face-hatch', Math.max(4, W / 260)));
    svg.append(hatchDefs('face-hatch-legend', 4));

    // Big head (frame 24: ~400 px wide on 1440×900, centred, upper half)
    headW = 1.2 * (portrait() ? Math.min(W * 0.6, H * 0.32) : Math.min(H * 0.42, W * 0.3));
    headX = W / 2 - headW / 2;
    headY = portrait() ? H * 0.25 : (H - headW * HEAD_ASPECT) / 2; // centred in the height (desktop)
    cells = voronoiHead(partTotals, headW, 11);
    headG = svgEl('g', { class: 'faces__head' });
    headG.setAttribute('transform', `translate(${headX} ${headY})`);
    big = drawHead(headG, cells, headW, { hatchId: 'face-hatch', stroke: 2.5 });
    paths = big.paths;
    leader = svgEl('g', { class: 'faces__leader' });
    riseG = svgEl('g'); // GSAP moves this one; headG's own transform is set by hand (burst + zoom)
    riseG.append(headG);
    svg.append(riseG, leader);

    // Legends: left and right columns (desktop), one panel under the head (phones)
    const left = PARTS.filter((p) => p.side === 'left'), right = PARTS.filter((p) => p.side === 'right');
    const headH = headW * HEAD_ASPECT;
    for (const p of PARTS) {
      const el = document.createElement('div');
      el.className = `face-label face-label--${p.side}`;
      el.innerHTML = `${hexagon(p.color, p.key === 'Live_tigers')}
        <div class="face-label__text"><strong>${p.label}</strong>
        <span>in ${fmt.format(partTotals[p.key])} seizures</span>
        <code>${p.units ?? 'units not reported'}</code></div>`;
      if (portrait()) {
        Object.assign(el.style, { left: '50%', top: `${headY + headH + 18}px`, transform: 'translateX(-50%)' });
      } else {
        const col = p.side === 'left' ? left : right;
        const i = col.indexOf(p);
        const y = headY + headH * (0.08 + (i * 0.84) / Math.max(1, col.length - 1));
        if (p.side === 'left') Object.assign(el.style, { right: `${W - headX + 70}px`, top: `${y}px` });
        else Object.assign(el.style, { left: `${headX + headW + 70}px`, top: `${y}px` });
      }
      labelsBox.append(el);
      labelEls.set(p.key, el);
    }

    // Year heads: head area ∝ seizures that year; 2025 (Jan–Jun) dashed
    rowG = svgEl('g', { class: 'faces__row' });
    yearLeader = svgEl('polyline', { class: 'faces__leader-line faces__year-leader', points: '' });
    svg.append(rowG, yearLeader);
    const maxS = Math.max(...years.map((y) => y.seizures));
    const perRow = portrait() ? 13 : years.length;
    const rows = Math.ceil(years.length / perRow);
    const x0 = portrait() ? W * 0.06 : W * 0.12, x1 = portrait() ? W * 0.94 : W * 0.86;
    const step = (x1 - x0) / perRow;
    const maxW = Math.min(step * 0.95, portrait() ? 30 : 46);
    const rowBottom = (r: number) => (portrait() ? H * 0.78 + r * (maxW * 1.9) : H * 0.91);
    if (!portrait()) {
      const t = svgEl('text', { x: x0 - 14, y: rowBottom(0) + 18, class: 'faces__year-axis', 'text-anchor': 'end' });
      t.textContent = 'YEAR';
      rowG.append(t);
    }
    years.forEach((y, i) => {
      const r = Math.floor(i / perRow), c = i % perRow;
      const w = maxW * Math.sqrt(y.seizures / maxS);
      const cx = x0 + step * (c + 0.5);
      const bottom = rowBottom(r);
      const g = svgEl('g', { class: 'faces__year', tabindex: 0, role: 'button', 'aria-label': `${y.year}` });
      const head = svgEl('g');
      head.setAttribute('transform', `translate(${cx - w / 2} ${bottom - w * HEAD_ASPECT})`);
      drawHead(head, voronoiHead(y.parts, w, y.year), w, { hatchId: 'face-hatch', stroke: 1, dashed: y.partial });
      const boxTop = bottom - maxW * HEAD_ASPECT - 6;
      const box = svgEl('rect', { x: cx - step * 0.47, y: boxTop, width: step * 0.94, height: bottom + 26 - boxTop, class: 'faces__year-box' });
      const label = svgEl('text', { x: cx, y: bottom + 18, 'text-anchor': 'middle', class: 'faces__year-label' });
      label.textContent = String(y.year).slice(2);
      const hit = svgEl('rect', { x: cx - step / 2, y: bottom - maxW * HEAD_ASPECT - 6, width: step, height: maxW * HEAD_ASPECT + 32, fill: 'transparent' });
      g.append(hit, box, head, label);
      rowG.append(g);
      yearEls.push({ g, box, label, year: y, cx, bottom, top: boxTop });
    });
    bindHover();
  }

  // ---------------------------------------------------------------- explore
  let explorable = false;
  let activePart: PartKey | null = null;
  let activeYear: number | null = null;

  function showPart(key: PartKey | null) {
    activePart = key;
    leader.innerHTML = '';
    for (const [k, el] of labelEls) el.classList.toggle('is-on', k === key);
    for (const [k, p] of paths) p.classList.toggle('is-dim', key !== null && k !== key);
    if (!key) return;
    const cell = cells.find((c) => c.key === key);
    const el = labelEls.get(key)!;
    if (!cell) return;
    const cx = headX + cell.centroid[0], cy = headY + cell.centroid[1];
    const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const hex = el.querySelector('.face-label__hex')!.getBoundingClientRect();
    const hx = (partByKey.get(key)!.side === 'left' ? hex.right + 6 : hex.left - 6) - s.left;
    const hy = hex.top + hex.height / 2 - s.top;
    const pts = portrait()
      ? `${cx},${cy} ${cx},${r.top - s.top - 6}`
      : `${hx},${hy} ${hx + (partByKey.get(key)!.side === 'left' ? 30 : -30)},${hy} ${cx},${cy}`;
    leader.append(svgEl('polyline', { points: pts, class: 'faces__leader-line' }));
    leader.append(svgEl('circle', { cx, cy, r: 5, class: 'faces__leader-dot' }));
  }

  function showYear(year: number | null) {
    activeYear = year;
    for (const y of yearEls) y.g.classList.toggle('is-on', y.year.year === year);
    if (year === null) { note.hidden = true; yearLeader.setAttribute('points', ''); return; }
    const y = yearEls.find((e) => e.year.year === year)!;
    const d = y.year;
    const ct = d.parts.Claws + d.parts.Teeth;
    note.innerHTML = `<strong>${d.year}${d.partial ? ' (Jan–Jun)' : ''}:</strong> skins ${pct(d.parts.Skins, d.partTotal)}% of part records;<br />live tigers ${pct(d.parts.Live_tigers, d.partTotal)}%, claws + teeth ${pct(ct, d.partTotal)}% · ${fmt.format(d.seizures)} seizures`;
    note.hidden = false;
    // the line leaves the top of the white box, goes up and turns towards the text
    const w = note.offsetWidth, h = note.offsetHeight;
    const toRight = y.cx < vw() / 2;
    const lineY = Math.min(...yearEls.map((e) => e.top)) - 22; // where the line turns: above the (first) row
    const textX = toRight ? y.cx + 14 : y.cx - 14 - w;
    note.classList.toggle('faces__note--left', !toRight);
    note.style.left = `${Math.min(vw() - w - 12, Math.max(12, textX))}px`;
    note.style.top = `${lineY - h / 2}px`;
    yearLeader.setAttribute('points', `${y.cx},${y.top} ${y.cx},${lineY} ${y.cx + (toRight ? 9 : -9)},${lineY}`);
  }

  function bindHover() {
    for (const [key, p] of paths) {
      p.addEventListener('pointerenter', (e) => { if (explorable && e.pointerType === 'mouse') showPart(key); });
      p.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') showPart(null); });
      p.addEventListener('click', () => { if (explorable) showPart(activePart === key ? null : key); });
    }
    for (const y of yearEls) {
      const yr = y.year.year;
      y.g.addEventListener('pointerenter', (e) => { if (explorable && e.pointerType === 'mouse') showYear(yr); });
      y.g.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') showYear(null); });
      // a tap also focuses the head: remember whether it was open before the tap
      let wasOn = false;
      y.g.addEventListener('pointerdown', () => { wasOn = activeYear === yr; });
      y.g.addEventListener('click', () => { if (explorable) showYear(wasOn ? null : yr); wasOn = activeYear === yr; });
      y.g.addEventListener('focus', () => { if (explorable) showYear(yr); });
      y.g.addEventListener('blur', () => showYear(null));
    }
  }

  // ---------------------------------------------------------------- timeline
  const FPS = 12;
  const held = (t: number) => Math.floor(t * FPS + 1e-6) / FPS;
  let tl = gsap.timeline({ paused: true });

  function build() {
    const progress = tl.progress();
    tl.kill();
    layout();
    const D = reduced ? 0.01 : 1;
    const headParts = [...paths.values()];
    const yearGs = yearEls.map((y) => y.g);
    // The burst: every cell flies away from the head's centre, spinning, outlined in yellow
    const centre = [headW / 2, (headW * HEAD_ASPECT) / 2];
    const flight = cells.map((c, i) => {
      const dx = c.centroid[0] - centre[0], dy = c.centroid[1] - centre[1];
      const len = Math.hypot(dx, dy) || 1;
      const dist = (0.1 + ((i * 37) % 10) / 45) * headW; // in head units: the zoom makes them huge
      return { path: paths.get(c.key)!, x: (dx / len) * dist, y: (dy / len) * dist, r: ((i % 2 ? 1 : -1) * (35 + ((i * 53) % 60))), cx: c.centroid[0], cy: c.centroid[1] };
    });
    const burst = { t: 0 };
    // 0 → 0.2: the head cracks (yellow seams, pieces a little apart);
    // 0.2 → 1: the camera rushes in — the pieces fill the screen (frame 27) while they drift apart
    const ZOOM = portrait() ? 11 : 14; // the camera rushes far into the pieces
    const renderBurst = () => {
      const u = held(burst.t);
      const crack = Math.min(1, u / 0.2);
      const v = Math.max(0, (u - 0.2) / 0.8);
      const e = 0.18 * crack + 0.82 * v * v * (3 - 2 * v);
      const z = 1 + (ZOOM - 1) * Math.pow(v, 1.6);
      for (const f of flight) {
        f.path.setAttribute('transform', `translate(${f.x * e} ${f.y * e}) rotate(${f.r * e} ${f.cx} ${f.cy})`);
        f.path.style.stroke = u > 0 ? '#ffdd03' : '#111';
        f.path.style.strokeWidth = u > 0 ? String(3 / z) : String(2.5 * 0.6);
      }
      headG.setAttribute('transform', `translate(${headX + (headW / 2) * (1 - z)} ${headY + ((headW * HEAD_ASPECT) / 2) * (1 - z)}) scale(${z})`);
      big.setPieces(u > 0);
    };

    tl = gsap.timeline({ paused: true });
    tl.addLabel('hidden')
      .from(riseG, { y: vh() * 0.8, duration: 0.8 * D, ease: 'power3.out' }, 0)           // 22 → 23: rises
      .fromTo(title, { x: vw() * 0.6, opacity: 0 }, { x: 0, y: 0, rotation: 0, opacity: 1, duration: 0.6 * D, ease: 'power3.out' }, 0.35 * D) // 23: title in
      .fromTo(section.querySelector('.faces__lede'), { opacity: 0 }, { opacity: 0.75, duration: 0.4 * D }, 0.7 * D)
      .from(yearGs, { opacity: 0, scale: 0.2, transformOrigin: '50% 100%', duration: 0.12, stagger: 0.025, ease: 'steps(2)' }, 0.6 * D)
      .addLabel('in')
      // 25 → 27: the burst, then everything fades into the page colour (28)
      .call(() => { showPart(null); showYear(null); }, [], 'in+=0.01')
      .to(burst, { t: 1, duration: 1.3 * D, ease: 'none', onUpdate: renderBurst }, 'in+=0.01')
      .to(rowG.querySelector('.faces__year-axis') ?? {}, { opacity: 0, duration: 0.3 }, 'in+=0.05')
      .to(yearGs, { y: vh() * 0.5, rotation: (i: number) => (i % 2 ? 25 : -25), opacity: 0, duration: 0.9 * D, ease: 'power2.in', stagger: 0.01 }, 'in+=0.05')
      .to(title, { x: -vw() * 0.3, y: vh() * 0.3, rotation: -18, opacity: 0, duration: 0.9 * D, ease: 'power2.in' }, 'in+=0.05')
      .to(section.querySelector('.faces__lede'), { opacity: 0, duration: 0.3 }, 'in+=0.05')
      .to(headParts, { opacity: 0, duration: 0.35 * D, ease: 'power2.in' }, `in+=${1.15 * D}`)
      .addLabel('out');
    renderBurst();
    tl.progress(progress);
  }

  build();
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(build, 200); });

  registerScene({
    section, get tl() { return tl; }, labels: ['hidden', 'in', 'out'], at: [-0.35, 1.0], cutBackFrom: 2, passAt: [1],
    onStep: (i) => { explorable = i === 1; stage.classList.toggle('is-explorable', explorable); if (!explorable) { showPart(null); showYear(null); } },
  } as Parameters<typeof registerScene>[0]);
  return section;
}
