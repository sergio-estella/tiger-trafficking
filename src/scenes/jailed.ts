/**
 * 04 → 05 · Trophy vs amulet, people jailed, the man behind bars (frames 68–78).
 *
 *  hidden → trophy   "Trophy vs amulet": skins + bones against claws + teeth, % of
 *                    part records per year, dot by dot (68–69); HOLD
 *  trophy → jailed   it slides up and away; "People jailed for tiger trafficking"
 *                    comes up and its bars land in pieces (70–71); HOLD · EXPLORE
 *                    (hover / tap a year)
 *  jailed → words  the chart fades out while the man behind bars comes through
 *                    (72–74); cut to red on black (75); PEOPLE JAILED in black comes
 *                    in huge, the screen almost all black, and settles on his face
 *                    (76); HOLD · READ
 *  words → out       on its own: the letters turn into windows on the man and pull
 *                    back (77); black, a red drop falls (78); chapter 05 follows,
 *                    a black curtain sliding away to the left (79–80)
 */
import { gsap } from 'gsap';
import { registerScene } from '../engine';
import { EVENTS, parseCsv, years } from '../data/series';
import { svgEl } from '../charts/faces';
import { placeTip } from '../tip';
import jailedCsv from '../data/data_people_jailed_by_country.csv?raw';
import manBlack from '../assets/ch04/man-black.png';
import manRed from '../assets/ch04/man-red.png';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FPS = 12;
const vw = () => window.innerWidth;
const vh = () => window.innerHeight;
const portrait = () => vh() > vw();
const C = { trophy: '#e2560c', amulet: '#741505', green: '#0b5a50' };

const COUNTRIES = [
  { key: 'India', label: 'India', color: '#e2560c' },
  { key: 'China', label: 'China', color: '#ffffff' },
  { key: 'Indonesia', label: 'Indonesia', color: '#6b3214' },
  { key: 'Viet Nam', label: 'Viet Nam', color: '#9e220a' },
  { key: 'Nepal', label: 'Nepal', color: '#6e5a96' },
  { key: 'Other tiger range countries', label: 'Other countries', color: '#8c8070' },
];
const jailedRows = parseCsv(jailedCsv).filter((r) => /^\d{4}$/.test(r.year)).map((r) => ({
  year: Number(r.year), total: Number(r.Total || 0),
  by: COUNTRIES.map((c) => Number(r[c.key] || 0)),
}));
const totals = COUNTRIES.map((_, i) => jailedRows.reduce((s, r) => s + r.by[i], 0));
const grand = jailedRows.reduce((s, r) => s + r.total, 0);
// the two peaks the storyboard points at, worked out from the data
const peakNote = (year: number) => {
  const r = jailedRows.find((x) => x.year === year)!;
  const i = r.by.indexOf(Math.max(...r.by));
  return `${year}: ${r.by[i]} of ${r.total} in ${COUNTRIES[i].label}`;
};

export function buildJailed(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'scene jailed';
  section.dataset.frames = '68–78';
  section.style.height = '470vh';
  section.setAttribute('aria-label', 'Trophy versus amulet, and people jailed for tiger trafficking');
  section.innerHTML = `
    <div class="scene__stage jailed__stage">
      <div class="jailed__man jailed__man--black" style="background-image:url('${manBlack}')" aria-hidden="true"></div>
      <div class="jailed__man jailed__man--red" style="background-image:url('${manRed}')" aria-hidden="true"></div>
      <header class="jailed__title jailed__title--trophy">
        <h2 class="display">Trophy vs amulet</h2>
        <p>Skins + bones vs claws + teeth · % of part records per year</p>
      </header>
      <header class="jailed__title jailed__title--jailed">
        <h2 class="display">People jailed for tiger trafficking</h2>
        <p>Tiger range countries · 2000–2021 · by country</p>
      </header>
      <svg class="jailed__svg" aria-hidden="true"></svg>
      <div class="jailed__legend">
        ${COUNTRIES.map((c, i) => `<span><i style="--c:${c.color}"></i><b>${c.label}</b> ${totals[i]}</span>`).join('')}
        <span class="jailed__total">Total: ${grand} people</span>
      </div>
      <div class="jailed__tip" hidden></div>
      <div class="jailed__words jailed__words--solid display" aria-hidden="true"><span>People</span><span>Jailed</span></div>
      <div class="jailed__words display" aria-hidden="true" style="background-image:url('${manRed}')"><span>People</span><span>Jailed</span></div>
      <svg class="jailed__drop" aria-hidden="true" viewBox="0 0 100 160"><path d="M50 0C50 40 92 70 92 112a42 42 0 0 1-84 0C8 70 50 40 50 0Z" /></svg>
    </div>`;
  const stage = section.querySelector<HTMLElement>('.jailed__stage')!;
  const svg = section.querySelector<SVGSVGElement>('.jailed__svg')!;
  const tTrophy = section.querySelector<HTMLElement>('.jailed__title--trophy')!;
  const tJailed = section.querySelector<HTMLElement>('.jailed__title--jailed')!;
  const legend = section.querySelector<HTMLElement>('.jailed__legend')!;
  const tip = section.querySelector<HTMLElement>('.jailed__tip')!;
  const black = section.querySelector<HTMLElement>('.jailed__man--black')!;
  const red = section.querySelector<HTMLElement>('.jailed__man--red')!;
  const solid = section.querySelector<HTMLElement>('.jailed__words--solid')!;
  const words = section.querySelector<HTMLElement>('.jailed__words:not(.jailed__words--solid)')!;
  const drop = section.querySelector<SVGSVGElement>('.jailed__drop')!;

  let trophyG: SVGGElement, jailedG: SVGGElement, grid: SVGGElement;
  let pieces: { el: SVGRectElement; x: number; y: number; r: number }[] = [];
  let dots: SVGElement[] = [];
  let x0 = 0, x1 = 0, band = 0, jy1Px = 0;

  function layout() {
    svg.innerHTML = '';
    const W = vw(), H = vh();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    x0 = portrait() ? W * 0.1 : W * 0.06; x1 = portrait() ? W * 0.97 : W * 0.97;
    band = (x1 - x0) / years.length;
    const xc = (i: number) => x0 + band * (i + 0.5);

    // background grid: one thin line per year, yellow event columns (frames 70–73)
    grid = svgEl('g', { class: 'jailed__grid' });
    years.forEach((y, i) => {
      if (EVENTS[y.year]) grid.append(svgEl('rect', { x: x0 + band * i + band * 0.1, y: 0, width: band * 0.8, height: H, class: 'jailed__event' }));
      grid.append(svgEl('line', { x1: xc(i), x2: xc(i), y1: 0, y2: H, class: 'jailed__vline' }));
    });
    svg.append(grid);

    // ---- trophy vs amulet (dots + thin line per series)
    trophyG = svgEl('g', { class: 'jailed__trophy' });
    const ty0 = H * (portrait() ? 0.36 : 0.3), ty1 = H * (portrait() ? 0.62 : 0.6);
    const ty = (v: number) => ty1 - (v / 80) * (ty1 - ty0);
    for (const v of [0, 20, 40, 60, 80]) {
      trophyG.append(svgEl('line', { x1: x0, x2: x1, y1: ty(v), y2: ty(v), class: 'jailed__gridline' }));
      const t = svgEl('text', { x: x0 - 8, y: ty(v) + 4, 'text-anchor': 'end', class: 'jailed__tick' });
      t.textContent = `${v}%`;
      trophyG.append(t);
    }
    dots = [];
    for (const [key, color] of [['pctTrophy', C.trophy], ['pctAmulet', C.amulet]] as const) {
      const pts = years.map((y, i) => [xc(i), ty(y[key] ?? 0)] as const);
      trophyG.append(svgEl('path', { d: pts.map((p, i) => `${i ? 'L' : 'M'}${p.join(',')}`).join(''), stroke: color, class: 'jailed__line' }));
      years.forEach((y, i) => {
        const c = svgEl('circle', { cx: pts[i][0], cy: pts[i][1], r: portrait() ? 3 : 5, fill: color, class: y.partial ? 'is-partial' : '' });
        trophyG.append(c);
        dots.push(c);
      });
      // first and last values
      const f = years[0][key] ?? 0, l = years[years.length - 1][key] ?? 0;
      const a = svgEl('text', { x: pts[0][0] + 8, y: pts[0][1] + 4, fill: color, class: 'jailed__value' }); a.textContent = `${Math.round(f)}%`;
      const b = svgEl('text', { x: pts[pts.length - 1][0] + 8, y: pts[pts.length - 1][1] + 4, fill: color, class: 'jailed__value' }); b.textContent = `${Math.round(l)}%`;
      trophyG.append(a, b);
    }
    // years along the bottom, as in the other year charts
    years.forEach((y, i) => {
      if (portrait() && i % 5) return;
      const t = svgEl('text', { x: xc(i), y: ty1 + 20, 'text-anchor': 'middle', class: 'jailed__year' });
      t.textContent = i === 0 || portrait() ? String(y.year) + (y.partial ? '*' : '') : `'${String(y.year).slice(2)}${y.partial ? '*' : ''}`;
      trophyG.append(t);
    });
    const k = svgEl('text', { x: x0, y: ty1 + 48, class: 'jailed__key' });
    k.innerHTML = `<tspan fill="${C.trophy}">●</tspan> trophy: skins + bones   <tspan fill="${C.amulet}">●</tspan> amulet: claws + teeth   ·   2025 = January–June`;
    trophyG.append(k);
    svg.append(trophyG);

    // ---- people jailed (stacked by country; 2022–2025 no data)
    jailedG = svgEl('g', { class: 'jailed__bars' });
    const jy0 = H * 0.4, jy1 = H * 0.62;
    jy1Px = jy1;
    const jy = (v: number) => jy1 - (v / 60) * (jy1 - jy0);
    for (const v of [0, 20, 40, 60]) {
      jailedG.append(svgEl('line', { x1: x0, x2: x1, y1: jy(v), y2: jy(v), class: 'jailed__gridline' }));
      const t = svgEl('text', { x: x0 - 8, y: jy(v) + 4, 'text-anchor': 'end', class: 'jailed__tick' });
      t.textContent = String(v);
      jailedG.append(t);
    }
    pieces = [];
    jailedRows.forEach((r) => {
      const i = years.findIndex((y) => y.year === r.year);
      const w = band * 0.62, x = x0 + band * i + (band - w) / 2;
      let acc = 0;
      r.by.forEach((n, c) => {
        if (!n) return;
        const el = svgEl('rect', { x, width: w, y: jy(acc + n), height: jy(acc) - jy(acc + n), fill: COUNTRIES[c].color, class: 'jailed__seg' });
        jailedG.append(el);
        const j = pieces.length;
        pieces.push({ el, x: (((j * 73) % 23) - 11) * W * 0.04, y: -H * (0.5 + ((j * 41) % 10) / 10), r: (j % 2 ? 1 : -1) * (20 + ((j * 29) % 60)) });
        acc += n;
      });
      const t = svgEl('text', { x: x + w / 2, y: jy(r.total) - 6, 'text-anchor': 'middle', class: 'jailed__count' });
      t.textContent = String(r.total);
      jailedG.append(t);
      const hit = svgEl('rect', { x: x0 + band * i, y: jy0 - 20, width: band, height: jy1 - jy0 + 26, class: 'jailed__hit' });
      hit.addEventListener('pointerenter', (e) => { if (explorable && e.pointerType === 'mouse') showTip(r, x + w / 2, jy(r.total)); });
      hit.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') showTip(null); });
      hit.addEventListener('click', () => { if (explorable) showTip(tip.dataset.year === String(r.year) ? null : r, x + w / 2, jy(r.total)); });
      jailedG.append(hit);
    });
    if (!portrait()) {
      for (const year of [2007, 2014]) {
        const r = jailedRows.find((x) => x.year === year)!;
        const i = years.findIndex((y) => y.year === year);
        const t = svgEl('text', { x: x0 + band * (i + 0.85), y: jy(r.total) + 4, class: 'jailed__ann' });
        t.textContent = peakNote(year);
        jailedG.append(t);
      }
    }
    const i22 = years.findIndex((y) => y.year === 2022);
    jailedG.append(svgEl('rect', { x: x0 + band * i22 + 4, y: jy(22), width: band * 4 - 8, height: jy(0) - jy(22), class: 'jailed__nodata' }));
    const nd = svgEl('text', { x: x0 + band * (i22 + 2), y: jy(11) + 4, 'text-anchor': 'middle', class: 'jailed__nodata-label' });
    nd.textContent = 'no data 2022–2025';
    jailedG.append(nd);
    svg.append(jailedG);
    legend.style.top = `${jy1 + 22}px`;
    legend.style.left = `${x0}px`;
  }

  let explorable = false;
  function showTip(r: (typeof jailedRows)[number] | null, x = 0, y = 0) {
    if (!r) { tip.hidden = true; tip.dataset.year = ''; return; }
    tip.dataset.year = String(r.year);
    tip.innerHTML = `<strong>${r.year}</strong> ${r.total} people jailed${r.total ? ' · ' + COUNTRIES.map((c, i) => (r.by[i] ? `${c.label} ${r.by[i]}` : '')).filter(Boolean).join(', ') : ''}`;
    tip.hidden = false;
    const w = band * 0.62;
    placeTip(tip, new DOMRect(x - w / 2, y - 18, w, jy1Px - y + 18), [legend.getBoundingClientRect(), tJailed.getBoundingClientRect()], ['above', 'right', 'left']);
  }

  // ---------------------------------------------------------------- timeline
  const fly = { p: 1 };
  const renderFly = () => {
    const p = Math.round(fly.p * FPS) / FPS;
    for (const f of pieces) {
      if (p === 0) { f.el.removeAttribute('transform'); continue; }
      const x = Number(f.el.getAttribute('x')) + Number(f.el.getAttribute('width')) / 2;
      const y = Number(f.el.getAttribute('y')) + Number(f.el.getAttribute('height')) / 2;
      f.el.setAttribute('transform', `translate(${f.x * p} ${f.y * p}) rotate(${f.r * p} ${x} ${y})`);
    }
  };
  const zoom = { z: 1 };
  const renderWords = () => {
    const z = 1 + Math.round((zoom.z - 1) * 8) / 8; // pulls back in 8 drawings
    words.style.transform = `scale(${z})`;
  };
  // the black letters come from behind the viewer: huge (the screen almost all black),
  // then they shrink onto the man's face, on twos
  const come = { z: 1 };
  const renderSolid = () => {
    const z = Math.exp(Math.round(Math.log(come.z) * 10) / 10);
    solid.style.transform = `scale(${z})`;
  };
  const fall = { y: 0 };
  const renderDrop = () => {
    const y = Math.round(fall.y * FPS) / FPS;
    drop.style.transform = `translateY(${(-0.3 + y * 1.4) * vh()}px) scale(${1 + y * 0.6})`;
  };

  let tl = gsap.timeline({ paused: true });
  function build() {
    const progress = tl.progress();
    tl.kill();
    layout();
    const D = reduced ? 0.01 : 1;
    const H = vh();
    tl = gsap.timeline({ paused: true });
    tl.addLabel('hidden')
      .set([black, red, words, solid, drop], { autoAlpha: 0 }, 0)
      .set(stage, { backgroundColor: '' }, 0)
      .fromTo(tTrophy, { autoAlpha: 0, x: -60 }, { autoAlpha: 1, x: 0, duration: 0.5 * D, ease: 'power3.out' }, 0)
      .fromTo(grid, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'steps(3)' }, 0.1 * D)
      .fromTo(trophyG, { opacity: 0 }, { opacity: 1, duration: 0.01 }, 0.2 * D)
      .fromTo(dots, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.17, ease: 'steps(2)', stagger: 0.02 }, 0.25 * D)
      .set(jailedG, { opacity: 0 }, 0)
      .set([tJailed, legend], { autoAlpha: 0 }, 0)
      .addLabel('trophy')
      // 70–71: trophy goes up, people jailed comes up, its bars land in pieces
      .to([trophyG, tTrophy], { y: -H * 0.7, duration: 0.6 * D, ease: 'power2.in' }, 'trophy+=0.01')
      .set(trophyG, { opacity: 0 }, `trophy+=${0.62 * D}`)
      .fromTo(tJailed, { autoAlpha: 0, y: H * 0.4 }, { autoAlpha: 1, y: 0, duration: 0.6 * D, ease: 'power3.out' }, `trophy+=${0.45 * D}`)
      .set(jailedG, { opacity: 1 }, `trophy+=${0.6 * D}`)
      .fromTo(fly, { p: 1 }, { p: 0, duration: 0.8 * D, ease: 'power3.out', onUpdate: renderFly, immediateRender: false }, `trophy+=${0.6 * D}`)
      .fromTo(legend, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, `trophy+=${1.3 * D}`)
      .addLabel('jailed')
      // 72–74: the chart fades out while the man behind bars comes through
      .call(() => showTip(null), [], 'jailed+=0.01')
      .to([jailedG, grid, tJailed, legend], { autoAlpha: 0, duration: 0.45 * D, ease: 'steps(4)' }, 'jailed+=0.01')
      .fromTo(black, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 * D, ease: 'steps(4)' }, `jailed+=${0.15 * D}`)
      // 75: cut to red on black
      .set(stage, { backgroundColor: '#000' }, `jailed+=${0.95 * D}`)
      .set(red, { autoAlpha: 1 }, `jailed+=${0.95 * D}`)
      .set(black, { autoAlpha: 0 }, `jailed+=${0.95 * D}`)
      // 75 → 76: PEOPLE JAILED in black comes in huge and settles on his face
      .set(solid, { autoAlpha: 1 }, `jailed+=${1.0 * D}`)
      .fromTo(come, { z: 9 }, { z: 1, duration: 1.0 * D, ease: 'power3.out', onUpdate: renderSolid, immediateRender: false }, `jailed+=${1.0 * D}`)
      .addLabel('words')
      // 77 (on its own): the letters turn into windows on the man, and pull back
      .set([solid, red], { autoAlpha: 0 }, 'words+=0.01')
      .set(words, { autoAlpha: 1 }, 'words+=0.01')
      .fromTo(zoom, { z: 1.15 }, { z: 0.85, duration: 0.8 * D, ease: 'power2.inOut', onUpdate: renderWords, immediateRender: false }, 'words+=0.01')
      // 78: black; a red drop falls; on to chapter 05 (a black curtain slides away)
      .to(words, { autoAlpha: 0, duration: 0.25 * D, ease: 'steps(2)' }, `words+=${0.85 * D}`)
      .set(drop, { autoAlpha: 1 }, `words+=${1.0 * D}`)
      .fromTo(fall, { y: 0 }, { y: 1, duration: 0.8 * D, ease: 'power2.in', onUpdate: renderDrop, immediateRender: false }, `words+=${1.0 * D}`)
      .set(drop, { autoAlpha: 0 }, `words+=${1.8 * D}`)
      .addLabel('out');
    renderFly();
    renderWords();
    renderSolid();
    renderDrop();
    tl.progress(progress);
  }
  build();
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(build, 200); });

  registerScene({
    section, get tl() { return tl; },
    labels: ['hidden', 'trophy', 'jailed', 'words', 'out'], at: [-0.35, 0.9, 1.8, 2.7], cutBackFrom: 3, passAt: [3],
    onStep: (i) => { explorable = i === 2; stage.classList.toggle('is-explorable', explorable); if (!explorable) showTip(null); },
  } as Parameters<typeof registerScene>[0]);
  return section;
}
