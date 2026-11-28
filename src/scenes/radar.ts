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
import { svgEl } from '../charts/faces';
import { PERIOD_COLORS, YEAR_STOPS, periods, periodOf, yearRows, val, drawRadar } from '../charts/radar';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FPS = 12;
const vw = () => window.innerWidth;
const vh = () => window.innerHeight;
const portrait = () => vh() > vw();

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
      <svg class="radar__mask" aria-hidden="true"><path fill-rule="evenodd" /></svg>
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
  const maskPath = section.querySelector<SVGPathElement>('.radar__mask path')!;

  let chart: SVGGElement, web: SVGGElement, yearLines: SVGPathElement[] = [], shapes: SVGGElement[] = [], groupArcs: SVGGElement;
  let cx = 0, cy = 0, R = 1;

  function layout() {
    svg.innerHTML = '';
    const W = vw(), H = vh();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    cx = portrait() ? W / 2 : W * 0.57;
    cy = portrait() ? H * 0.56 : H * 0.48;
    R = portrait() ? W * 0.3 : Math.min(H * 0.32, W * 0.21);
    chart = svgEl('g');
    svg.append(chart);

    ({ web, yearLines, shapes, groupArcs } = drawRadar(chart, R));
    renderGrow();
    renderZoom();
    renderIris();
  }

  // ---------------------------------------------------------------- explore
  let explorable = false;
  let pinned: number | null = null; // a click keeps a period selected
  // one period at a time: its shape and its own year lines (one per year) stay;
  // everything else almost disappears
  function highlight(i: number | null) {
    legendItems.forEach((li, k) => { li.classList.toggle('is-on', k === i); li.classList.toggle('is-pinned', k === pinned); });
    section.classList.toggle('has-focus', i !== null);
    shapes.forEach((g, k) => {
      g.classList.toggle('is-dim', i !== null && k !== i);
      g.classList.toggle('is-on', k === i);
      if (k === i) g.parentNode!.append(g); // bring it forward
    });
    yearLines.forEach((p, k) => {
      const mine = i !== null && periodOf(yearRows[k].year) === i;
      p.classList.toggle('is-dim', i !== null && !mine);
      p.classList.toggle('is-mine', mine);
    });
  }
  const pin = (i: number | null) => { pinned = i; highlight(i); };
  legendItems.forEach((li, i) => {
    li.setAttribute('aria-pressed', 'false');
    li.addEventListener('pointerenter', (e) => { if (explorable && e.pointerType === 'mouse') highlight(i); });
    li.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') highlight(pinned); });
    li.addEventListener('click', () => {
      if (!explorable) return;
      pin(pinned === i ? null : i);
      legendItems.forEach((l, k) => l.setAttribute('aria-pressed', String(k === pinned)));
    });
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); } });
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

  const iris = { p: 0 };
  const renderIris = () => {
    const W = vw(), H = vh();
    const p = Math.round(iris.p * 8) / 8;
    const far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 4;
    const r = far * (1 - p);
    // the page colour everywhere except a circle that shrinks to nothing
    maskPath.setAttribute('d', p <= 0 ? '' : `M0,0H${W}V${H}H0Z M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`);
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
      .call(() => pin(null), [], 'in+=0.01')
      // out: a mask — a circle closes on the centre of the web, in 8 drawings
      .fromTo(iris, { p: 0 }, { p: 1, duration: 0.7 * D, ease: 'power2.in', onUpdate: renderIris, immediateRender: false }, 'in+=0.01')
      .addLabel('out');
    tl.progress(progress);
  }
  build();
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(build, 200); });

  registerScene({
    section, get tl() { return tl; }, labels: ['hidden', 'in', 'out'], at: [-0.35, 1.0], cutBackFrom: 2, passAt: [1],
    onStep: (i) => { explorable = i === 1; section.classList.toggle('is-explorable', explorable); if (!explorable) pin(null); },
  } as Parameters<typeof registerScene>[0]);
  return section;
}
