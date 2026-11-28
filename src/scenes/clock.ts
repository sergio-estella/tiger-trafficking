/**
 * 03 · "The trafficking clock" (frames 35–41).
 *
 * One slice = one year, 2000 → 2025 clockwise (2025 = January–June, dashed),
 * a gap at 12 o'clock for the ring names. Rings, inside → out:
 *   wild tigers (census line) · seizures (tiger range + outside) · tigers seized
 *   (range + outside) · % of seizures outside the range (tone) · whole animals
 *   (dead + live, % of seizures) · trophy / amulet (% of part records) ·
 *   people jailed (2000–2021).
 *
 *  hidden → in   an orange disc rolls in from the right and the clock draws
 *                itself slice by slice (35 → 39); HOLD · EXPLORE: hover / tap a
 *                slice to read that year
 *  in → out      the clock falls apart (40 → 41) and the page carries on
 */
import { gsap } from 'gsap';
import { registerScene } from '../engine';
import { YEAR_COLORS as C, years } from '../data/series';
import { hatchDefs, svgEl } from '../charts/faces';
import { drawClock, clockCard, LEGEND } from '../charts/clock';
import { placeTip, type Side } from '../tip';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const vw = () => window.innerWidth;
const vh = () => window.innerHeight;
const portrait = () => vh() > vw();

export function buildClock(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'scene clock';
  section.dataset.frames = '35–41';
  section.style.height = '250vh';
  section.setAttribute('aria-label', 'The trafficking clock, 2000 – June 2025');
  section.innerHTML = `
    <div class="scene__stage clock__stage">
      <h2 class="clock__head display">The trafficking clock</h2>
      <svg class="clock__svg" aria-hidden="true"></svg>
      <ul class="clock__legend">${LEGEND.map(([c, t, kind]) => `<li><span class="clock__sw clock__sw--${kind ?? 'box'}" style="--c:${c}"></span>${t}</li>`).join('')}</ul>
      <p class="clock__note">All rings read on the same radius: one year = one slice. Rings are drawn to their own scale. 2025 = January–June (dashed).</p>
      <div class="clock-card" hidden></div>
    </div>`;
  const stage = section.querySelector<HTMLElement>('.clock__stage')!;
  const svg = section.querySelector<SVGSVGElement>('.clock__svg')!;
  const legend = section.querySelector<HTMLElement>('.clock__legend')!;
  const headline = section.querySelector<HTMLElement>('.clock__head')!;
  const note = section.querySelector<HTMLElement>('.clock__note')!;
  const cardEl = section.querySelector<HTMLElement>('.clock-card')!;

  let ball: SVGGElement, centre: SVGGElement;
  let yearGs: SVGGElement[] = [];
  let decor: SVGGElement;
  let highlight: SVGPathElement;
  let cx = 0, cy = 0, R = 0;
  let explorable = false;

  function layout() {
    svg.innerHTML = '';
    const W = vw(), H = vh();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.append(hatchDefs('clock-hatch', 4));
    R = portrait() ? Math.min(W * 0.44, H * 0.28) : Math.min(H * 0.44, W * 0.3);
    cx = portrait() ? W / 2 : W * 0.39;
    cy = portrait() ? H * 0.36 : H * 0.5;
    const root = svgEl('g', { transform: `translate(${cx} ${cy})` });
    rootG = root;
    svg.append(root);

    const drawn = drawClock(root, R, {
      enter: (i) => { if (explorable) show(i); },
      leave: () => show(null),
      toggle: (i) => { if (explorable) show(current === i ? null : i); },
    });
    ({ decor, centre, yearGs } = drawn);
    hits.splice(0, hits.length, ...drawn.hits);

    highlight = svgEl('path', { class: 'clock__highlight', 'pointer-events': 'none' });
    root.append(highlight);
    // The disc that rolls in
    // (on top of the clock: it hides it until it fades away; the small dot shows it is rolling)
    ball = svgEl('g', { class: 'clock__ball', 'pointer-events': 'none' }); // faded, it must not catch the hover
    ball.append(svgEl('circle', { cx: 0, cy: 0, r: R * 1.07, fill: C.seizures, class: 'clock__disc' })); // covers the event wedges (1.05 R) too
    ball.append(svgEl('circle', { cx: R * 0.33, cy: R * 0.72, r: R * 0.11, fill: '#741505' }));
    root.append(ball);
    radius = R * 1.07;
    current = null;
    // highlight geometry
    highlightArc = drawn.highlightArc;
  }

  let current: number | null = null;
  const hits: SVGPathElement[] = [];
  let highlightArc = (_i: number) => '';
  function show(i: number | null) {
    current = i;
    if (i === null) { highlight.setAttribute('d', ''); cardEl.hidden = true; return; }
    highlight.setAttribute('d', highlightArc(i));
    cardEl.innerHTML = clockCard(years[i]);
    cardEl.hidden = false;
    // next to the slice, on its outer side, never over the slice nor the legend
    const a = hits[i].getBoundingClientRect();
    const right = a.left + a.width / 2 > cx, down = a.top + a.height / 2 > cy;
    const order: Side[] = [right ? 'right' : 'left', down ? 'below' : 'above', down ? 'above' : 'below', right ? 'left' : 'right'];
    placeTip(cardEl, a, [legend.getBoundingClientRect(), note.getBoundingClientRect(), headline.getBoundingClientRect()], order);
  }

  // ---------------------------------------------------------------- timeline
  const FPS = 12;
  let tl = gsap.timeline({ paused: true });
  let radius = 1;
  let rootG: SVGGElement;
  function build() {
    const progress = tl.progress();
    tl.kill();
    layout();
    const D = reduced ? 0.01 : 1;
    const spread = yearGs.map((_, i) => {
      const a = ((0.75 + i + 0.5) * 2 * Math.PI) / (years.length + 1.5);
      const dist = (0.6 + ((i * 37) % 10) / 12) * Math.max(vw(), vh());
      return { x: Math.sin(a) * dist, y: -Math.cos(a) * dist, r: (i % 2 ? 1 : -1) * (25 + ((i * 53) % 50)) };
    });
    // the ball rolls without slipping: it turns one radian per radius travelled
    const roll = { x: 1 };
    const travel = vw() * 0.9;
    let lastFrame = -1;
    const renderRoll = () => {
      const frame = Math.round(tl.time() * FPS); // drawn on twos (12 per second)
      if (frame === lastFrame && roll.x > 0 && roll.x < 1) return;
      lastFrame = frame;
      const px = roll.x * travel;
      ball.setAttribute('transform', `translate(${px} 0) rotate(${(px / radius) * (180 / Math.PI)})`);
    };
    const texts = Array.from(rootG.querySelectorAll<SVGTextElement>('text')).filter((t) => !centre.contains(t));
    gsap.set([...yearGs, decor], { opacity: 0 });
    tl = gsap.timeline({ paused: true });
    tl.addLabel('hidden')
      // 35 → 37: only the ball, rolling in from the right (drawn on twos), and it settles
      .fromTo(roll, { x: 1 }, { x: 0, duration: 0.9 * D, ease: 'power2.out', onUpdate: renderRoll, immediateRender: true }, 0)
      // 38 → 39: the clock is behind it; the ball fades away and reveals it, then the words come
      .set([...yearGs, decor], { opacity: 1 }, 0.95 * D)
      .to(ball, { opacity: 0, duration: 0.5 * D, ease: 'steps(4)' }, 1.0 * D)
      .from(texts, { opacity: 0, duration: 0.3, ease: 'steps(2)' }, 1.55 * D)
      .from(centre, { opacity: 0, duration: 0.3 }, 1.55 * D)
      // fromTo, not from: the legend outlives rebuilds (resize), so its end state is written out
      .fromTo([headline, legend, note], { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }, 1.6 * D)
      .addLabel('in')
      // 40 → 41: it falls apart
      .call(() => show(null), [], 'in+=0.01')
      .to(yearGs, { x: (i: number) => spread[i].x, y: (i: number) => spread[i].y, rotation: (i: number) => spread[i].r, svgOrigin: '0 0', duration: 1.1 * D, ease: `steps(${Math.round(1.1 * FPS)})` }, 'in+=0.01')
      .to([decor, centre, headline, legend, note], { opacity: 0, duration: 0.4 * D }, 'in+=0.01')
      .to(yearGs, { opacity: 0, duration: 0.3 * D }, `in+=${0.9 * D}`)
      .addLabel('out');
    tl.progress(progress);
  }
  build();
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(build, 200); });

  registerScene({
    section, get tl() { return tl; }, labels: ['hidden', 'in', 'out'], at: [-0.35, 1.0], cutBackFrom: 2, passAt: [1],
    onStep: (i) => { explorable = i === 1; stage.classList.toggle('is-explorable', explorable); if (!explorable) show(null); },
  } as Parameters<typeof registerScene>[0]);
  return section;
}
