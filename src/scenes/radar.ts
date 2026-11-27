/**
 * 04 · What is trafficked: the mix of parts, period by period (frames 63–67).
 *
 *  hidden → in   the web draws itself, one thin line per year appears, then the
 *                five period shapes grow from the centre one after another
 *                (2000–04 … 2020–25), with the three groups around the edge and
 *                the three readings below; HOLD · EXPLORE: hover / tap a period
 *                in the legend to bring its shape forward
 *  in → out      the camera rushes into the shapes (as with the head and the bars);
 *                the page carries on
 *
 * Data: derived_part_shares_by_period.csv and derived_part_shares_by_year.csv
 * (share of each part among all part appearances).
 */
import { gsap } from 'gsap';
import { registerScene } from '../engine';
import { parseCsv, type PartKey } from '../data/series';
import { svgEl } from '../charts/faces';
import periodsCsv from '../data/derived_part_shares_by_period.csv?raw';
import yearsCsv from '../data/derived_part_shares_by_year.csv?raw';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FPS = 12;
const vw = () => window.innerWidth;
const vh = () => window.innerHeight;
const portrait = () => vh() > vw();

// clockwise from the top, as in frame 66
const AXES: { key: PartKey; label: string }[] = [
  { key: 'Skins', label: 'skins' }, { key: 'Skulls', label: 'skulls' }, { key: 'Bones', label: 'bones' },
  { key: 'Meat', label: 'meat' }, { key: 'Derivatives', label: 'derivatives' }, { key: 'Other_parts', label: 'other parts' },
  { key: 'Paws', label: 'paws' }, { key: 'Teeth', label: 'teeth' }, { key: 'Claws', label: 'claws' },
  { key: 'Live_tigers', label: 'live tigers' }, { key: 'Dead_tigers', label: 'dead tigers' },
];
const GROUPS = [
  { from: 0, to: 5, label: 'trophy & traditional medicine', color: '#e2560c' },
  { from: 6, to: 8, label: 'amulet & jewellery', color: '#741505' },
  { from: 9, to: 10, label: 'whole animal', color: '#111111' },
];
const PERIOD_COLORS = ['#8a7a66', '#f6a33b', '#e2560c', '#9e220a', '#111111'];
const YEAR_STOPS = ['#a89a86', '#f6a33b', '#e2560c', '#9e220a', '#111111'];
const MAX = 55; // % at the outer ring (square-root scale)
const RINGS = [1, 10, 25, 50];

const periods = parseCsv(periodsCsv).map((r) => ({
  label: r.period, total: Number(r.part_appearances_total),
  v: AXES.map((a) => Number(r[`pct_${a.key}`])),
}));
const yearRows = parseCsv(yearsCsv).map((r) => ({ year: Number(r.year), v: AXES.map((a) => Number(r[`pct_${a.key}`])) }));

function lerpHex(stops: string[], t: number) {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  const a = parseInt(stops[i].slice(1), 16), b = parseInt(stops[i + 1].slice(1), 16);
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - f) + ((b >> s) & 255) * f);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
const val = (p: (typeof periods)[number], key: PartKey) => p.v[AXES.findIndex((a) => a.key === key)];

export function buildRadar(): HTMLElement {
  const first = periods[0], last = periods[periods.length - 1];
  const r0 = (n: number) => Math.round(n);
  const section = document.createElement('section');
  section.className = 'scene radar';
  section.dataset.frames = '63–67';
  section.style.height = '250vh';
  section.setAttribute('aria-labelledby', 'radar-title');
  section.innerHTML = `
    <div class="scene__stage radar__stage">
      <header class="radar__head">
        <h2 class="radar__title display" id="radar-title">What is trafficked</h2>
        <p class="radar__lede">Each shape = what the seizures were made of: share (%) of each part among all part appearances in the period. Square-root radial scale.</p>
        <ul class="radar__legend">
          ${periods.map((p, i) => `<li tabindex="0" data-i="${i}"><span style="--c:${PERIOD_COLORS[i]}"></span><strong>${p.label}${i === periods.length - 1 ? '*' : ''}</strong><small>${p.total.toLocaleString('en-GB')} appearances</small></li>`).join('')}
        </ul>
      </header>
      <svg class="radar__svg" aria-hidden="true"></svg>
      <div class="radar__years"><i style="background: linear-gradient(90deg, ${YEAR_STOPS.join(',')})"></i><span>2000</span><span>2025</span><small>thin lines: one per year</small></div>
      <ul class="radar__notes">
        <li style="--c:#e2560c"><strong>skins fall from ${r0(val(first, 'Skins'))}% to ${r0(val(last, 'Skins'))}%</strong><em>the trophy loses weight</em></li>
        <li style="--c:#741505"><strong>claws ${r0(val(first, 'Claws'))}% → ${r0(val(last, 'Claws'))}% and teeth ${r0(val(first, 'Teeth'))}% → ${r0(val(last, 'Teeth'))}%</strong><em>“the tiger is sold in pieces”</em></li>
        <li style="--c:#111"><strong>live tigers ${r0(val(first, 'Live_tigers'))}% → ${r0(val(last, 'Live_tigers'))}%</strong><em>“farms and pets”</em></li>
      </ul>
    </div>`;
  const svg = section.querySelector<SVGSVGElement>('.radar__svg')!;
  const head = section.querySelector<HTMLElement>('.radar__head')!;
  const legendItems = Array.from(section.querySelectorAll<HTMLElement>('.radar__legend li'));
  const notes = Array.from(section.querySelectorAll<HTMLElement>('.radar__notes li'));
  const yearsKey = section.querySelector<HTMLElement>('.radar__years')!;

  let chart: SVGGElement, web: SVGGElement, yearLines: SVGPathElement[] = [], shapes: SVGGElement[] = [], groupArcs: SVGGElement;
  let cx = 0, cy = 0, R = 1;
  const angle = (i: number) => (i / AXES.length) * Math.PI * 2;
  const pt = (i: number, v: number): [number, number] => {
    const r = Math.sqrt(Math.max(0, v) / MAX) * R;
    return [Math.sin(angle(i)) * r, -Math.cos(angle(i)) * r];
  };
  const shapeD = (v: number[]) => v.map((x, i) => `${i ? 'L' : 'M'}${pt(i, x).map((n) => n.toFixed(1)).join(',')}`).join('') + 'Z';

  function layout() {
    svg.innerHTML = '';
    const W = vw(), H = vh();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    cx = portrait() ? W / 2 : W * 0.62;
    cy = portrait() ? H * 0.56 : H * 0.48;
    R = portrait() ? W * 0.3 : Math.min(H * 0.32, W * 0.21);
    chart = svgEl('g');
    svg.append(chart);

    // web: rings + spokes + axis names
    web = svgEl('g', { class: 'radar__web' });
    for (const ring of RINGS) {
      const d = AXES.map((_, i) => `${i ? 'L' : 'M'}${pt(i, ring).join(',')}`).join('') + 'Z';
      web.append(svgEl('path', { d, class: 'radar__ring' }));
      const [x, y] = pt(1, ring);
      const t = svgEl('text', { x: x + 4, y: y - 3, class: 'radar__tick' });
      t.textContent = `${ring}%`;
      web.append(t);
    }
    AXES.forEach((a, i) => {
      const [x, y] = pt(i, MAX);
      web.append(svgEl('line', { x1: 0, y1: 0, x2: x, y2: y, class: 'radar__spoke' }));
      const [lx, ly] = pt(i, MAX * 1.22);
      const t = svgEl('text', { x: lx, y: ly + 5, 'text-anchor': 'middle', class: 'radar__axis' });
      t.textContent = a.label;
      web.append(t);
    });

    // thin lines, one per year
    const yg = svgEl('g', { class: 'radar__year-lines' });
    yearLines = yearRows.map((y) => {
      const p = svgEl('path', { d: shapeD(y.v), stroke: lerpHex(YEAR_STOPS, (y.year - 2000) / 25), class: 'radar__year' });
      yg.append(p);
      return p;
    });

    // period shapes (each in its own group: it grows from the centre)
    const sg = svgEl('g');
    shapes = periods.map((p, i) => {
      const g = svgEl('g', { class: 'radar__shape', 'data-i': i });
      g.append(svgEl('path', { d: shapeD(p.v), stroke: PERIOD_COLORS[i], fill: PERIOD_COLORS[i] }));
      sg.append(g);
      return g;
    });

    // the three groups around the edge
    groupArcs = svgEl('g', { class: 'radar__groups' });
    const step = (Math.PI * 2) / AXES.length;
    const RA = R * 1.36;
    for (const gr of GROUPS) {
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
    renderGrow();
    renderZoom();
  }

  // ---------------------------------------------------------------- explore
  let explorable = false;
  let active: number | null = null;
  function highlight(i: number | null) {
    active = i;
    legendItems.forEach((li, k) => li.classList.toggle('is-on', k === i));
    shapes.forEach((g, k) => {
      g.classList.toggle('is-dim', i !== null && k !== i);
      g.classList.toggle('is-on', k === i);
      if (k === i) g.parentNode!.append(g); // bring it forward
    });
    yearLines.forEach((p) => p.classList.toggle('is-dim', i !== null));
  }
  legendItems.forEach((li, i) => {
    li.addEventListener('pointerenter', (e) => { if (explorable && e.pointerType === 'mouse') highlight(i); });
    li.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') highlight(null); });
    li.addEventListener('click', () => { if (explorable) highlight(active === i ? null : i); });
    li.addEventListener('focus', () => { if (explorable) highlight(i); });
    li.addEventListener('blur', () => highlight(null));
  });

  // ---------------------------------------------------------------- timeline
  const grow = periods.map(() => ({ s: 0 }));
  const renderGrow = () => {
    shapes.forEach((g, i) => {
      const s = Math.round(grow[i].s * 6) / 6; // grows in 6 drawings
      g.setAttribute('transform', `scale(${Math.max(0.001, s)})`);
      g.style.visibility = s > 0 ? 'visible' : 'hidden';
    });
  };
  const zoom = { z: 1 };
  const renderZoom = () => {
    const z = 1 + Math.round((zoom.z - 1) * FPS) / FPS;
    chart.setAttribute('transform', `translate(${cx} ${cy}) scale(${z})`);
  };

  let tl = gsap.timeline({ paused: true });
  function build() {
    const progress = tl.progress();
    tl.kill();
    layout();
    const D = reduced ? 0.01 : 1;
    grow.forEach((g) => { g.s = 0; });
    zoom.z = 1;
    tl = gsap.timeline({ paused: true });
    tl.addLabel('hidden')
      .fromTo(head, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.5 * D, ease: 'power2.out' }, 0)
      .fromTo(web, { opacity: 0 }, { opacity: 1, duration: 0.3 * D, ease: 'steps(3)' }, 0.1 * D)
      .fromTo(yearLines, { opacity: 0 }, { opacity: 1, duration: 0.08, stagger: 0.025 * D, ease: 'steps(1)' }, 0.35 * D)
      .fromTo(legendItems, { opacity: 0 }, { opacity: 1, duration: 0.15, stagger: 0.22 * D }, 0.95 * D);
    grow.forEach((g, i) => tl.fromTo(g, { s: 0 }, { s: 1, duration: 0.4 * D, ease: 'back.out(1.6)', onUpdate: renderGrow, immediateRender: false }, (0.95 + i * 0.22) * D));
    tl.fromTo(groupArcs, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'steps(3)' }, 2.0 * D)
      .fromTo([...notes, yearsKey], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.12 }, 2.1 * D)
      .addLabel('in')
      // out: the camera rushes into the shapes
      .call(() => highlight(null), [], 'in+=0.01')
      .to([head, ...notes, yearsKey], { opacity: 0, duration: 0.2 }, 'in+=0.01')
      .fromTo(zoom, { z: 1 }, { z: 6, duration: 0.7 * D, ease: 'power2.in', onUpdate: renderZoom, immediateRender: false }, 'in+=0.01')
      .to(chart, { opacity: 0, duration: 0.25 * D, ease: 'power2.in' }, `in+=${0.5 * D}`)
      .addLabel('out');
    tl.progress(progress);
  }
  build();
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(build, 200); });

  registerScene({
    section, get tl() { return tl; }, labels: ['hidden', 'in', 'out'], at: [-0.35, 1.0], cutBackFrom: 2, passAt: [1],
    onStep: (i) => { explorable = i === 1; section.classList.toggle('is-explorable', explorable); if (!explorable) highlight(null); },
  } as Parameters<typeof registerScene>[0]);
  return section;
}
