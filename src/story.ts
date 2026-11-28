/**
 * Story skeleton: intro, chapter openers and chart placeholders, built from
 * src/content/chapters.ts, plus the stepped-scene engine they share.
 *
 * Stepped scene: the section's stage is sticky; scroll thresholds move a GSAP
 * timeline from one label to the next (ANIMATE on a clock, then HOLD). Going
 * back up plays the same steps backwards — cheap for text, and always in sync
 * with the scroll position.
 */
import { gsap } from 'gsap';
import { registerScene, registerStops, startEngine } from './engine';
import { buildFaces } from './scenes/faces';
import { buildClock } from './scenes/clock';
import { buildYears } from './scenes/years';
import { buildParts } from './scenes/parts';
import { buildRadar } from './scenes/radar';
import { buildJailed } from './scenes/jailed';
import { buildSeizures } from './scenes/seizures';
import { story, type From, type Opener, type Placeholder } from './content/chapters';
import headUrl from './assets/tiger-head.svg?url';
import walk1 from './assets/walk/frame-01.svg?raw'; // six drawn poses of a calm walk (35 units forward each)
import walk2 from './assets/walk/frame-02.svg?raw';
import walk3 from './assets/walk/frame-03.svg?raw';
import walk4 from './assets/walk/frame-04.svg?raw';
import walk5 from './assets/walk/frame-05.svg?raw';
import walk6 from './assets/walk/frame-06.svg?raw';
import shotUrl from './assets/walk/tiger-shot.svg?url'; // the shot tiger, lying down (storyboard artwork)
import splashUrl from './assets/ink-splash.svg?url';
import { gunshot } from './sound';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const vh = () => window.innerHeight;
const vw = () => window.innerWidth;

function offset(from: From) {
  switch (from) {
    case 'right': return { x: vw() * 1.15, y: 0 };  // far enough for long titles to leave the screen
    case 'left': return { x: -vw() * 1.15, y: 0 };
    case 'below': return { x: 0, y: vh() * 0.45 };
    case 'above': return { x: 0, y: -vh() * 0.6 };
    default: return { x: 0, y: 0 };
  }
}

function html(tag: string, cls: string, inner = '') {
  const el = document.createElement(tag);
  el.className = cls;
  el.innerHTML = inner;
  return el;
}

function buildOpener(o: Opener): HTMLElement {
  const section = html('section', `scene opener opener--${o.theme}${o.fromBlack ? ' opener--from-black' : ''}`);
  section.id = o.id;
  section.dataset.frames = o.frames;
  section.setAttribute('aria-labelledby', `${o.id}-title`);
  const hold = o.body2 ? 1.4 : 0.8;          // vh of reading before the text leaves
  section.style.height = `${(1 + hold + 0.4) * 100}vh`;

  const stage = html('div', 'scene__stage');
  const inner = html('div', 'opener__inner');
  const title = html('h2', 'opener__title display', o.title);
  title.id = `${o.id}-title`;
  inner.append(title);
  const sub = o.subtitle ? html('p', 'opener__subtitle', o.subtitle) : null;
  if (sub) inner.append(sub);
  const body = html('p', 'opener__body', o.body);
  inner.append(body);
  const body2 = o.body2 ? html('p', 'opener__body opener__body--next', o.body2) : null;
  stage.append(inner);
  if (body2) stage.append(body2);
  stage.append(html('span', 'opener__number', o.number));
  section.append(stage);

  // --- timeline: hidden → in → (next) → out
  const tl = gsap.timeline({ paused: true });
  const labels = ['hidden', 'in'];
  const at = [-0.35];
  const head = sub ? [title, sub] : [title];
  const D = reduced ? 0.01 : 0.6;
  const ease = 'power3.out';

  const fromT = offset(o.enter.title), fromB = offset(o.enter.body);
  tl.addLabel('hidden');
  if (o.fromBlack) {
    // 79 → 80: the black of the previous scene slides away to the left and uncovers the page
    const curtain = html('div', 'opener__curtain');
    stage.append(curtain);
    tl.fromTo(curtain, { xPercent: 0 }, { xPercent: -101, duration: reduced ? 0.01 : 0.9, ease: 'steps(9)' }, reduced ? 0 : 0.15);
  }
  if (o.enter.title !== 'none') tl.from(head, { x: fromT.x, y: fromT.y, duration: D, ease }, 0);
  if (o.enter.body !== 'none') tl.from(body, { x: fromB.x, y: fromB.y, opacity: 0, duration: D, ease }, D * 0.2);
  tl.addLabel('in', `+=${reduced ? 0 : 0.01}`);

  if (body2) {
    // Chapter 01: the opening text moves up and the second paragraph rises into place (frames 10 → 11)
    labels.push('next');
    at.push(0.6);
    tl.from(body2, { y: vh() * 0.55, opacity: 0, duration: D, ease }, 'in')
      .to(inner, { y: -vh() * 0.6, opacity: 0, duration: D, ease }, 'in')
      .addLabel('next');
  }

  labels.push('out');
  at.push(hold);
  const toT = offset(o.exit.title), toB = offset(o.exit.body);
  const leaving = body2 ? [body2] : [];
  tl.to(head, { x: toT.x, y: toT.y, duration: D, ease: 'power2.in' }, `${labels[labels.length - 2]}`)
    .to(body, { x: toB.x, y: toB.y, opacity: 0, duration: D, ease: 'power2.in' }, `${labels[labels.length - 2]}+=${D * 0.1}`);
  if (leaving.length) tl.to(leaving, { y: -vh() * 0.6, opacity: 0, duration: D, ease: 'power2.in' }, labels[labels.length - 2]);
  tl.addLabel('out');

  registerScene({ section, tl, labels, at, passAt: [at.length - 1] }); // the exit carries on to the next section
  return section;
}

function buildPlaceholder(p: Placeholder): HTMLElement {
  const section = html('section', 'placeholder');
  registerStops(() => [section.offsetTop]); // the step model rests on each placeholder too
  if (p.id) section.id = p.id;
  section.dataset.frames = p.frames;
  section.append(html('div', 'placeholder__box', `
    <span class="placeholder__frames">Frames ${p.frames} · to be built</span>
    <h3 class="placeholder__title">${p.title}</h3>
    <p class="placeholder__note">${p.note}</p>`));
  section.append(html('span', 'opener__number', p.number));
  return section;
}

/**
 * The walk: six drawings, same framing, scale and ground; in each one the tiger
 * stands 35 units further right. Each drawing is shifted back by its advance, so
 * the six stack on the same spot and the walker element carries the motion.
 */
const WALK_STEP = 35; // units forward per drawing
const WALK_BOX = { x: 20, y: 50, w: 570, h: 268 }; // crop around the tiger (ratio 0.47, as the walker box)
function walkRig() {
  const inner = [walk1, walk2, walk3, walk4, walk5, walk6].map((svg, i) => {
    const body = svg.replace(/^[\s\S]*?<g id="tiger"[^>]*>/, '').replace(/<\/g>\s*<\/svg>\s*$/, '');
    return `<g class="walker__pose" transform="translate(${-WALK_STEP * i} 0)"${i ? ' style="display:none"' : ''}>${body}</g>`;
  }).join('');
  return `<svg viewBox="${WALK_BOX.x} ${WALK_BOX.y} ${WALK_BOX.w} ${WALK_BOX.h}" aria-hidden="true">${inner}</svg>`;
}

/**
 * 00 · Intro + 01 (frames 1–15), one scene on one pale stage:
 *  hidden → in      title fades in (1 → 3) and waits
 *  in → ch01        scroll: zoom into the tiger's face until it disappears (4 → 8);
 *                   then "01.", the text and the menu button appear; waits on
 *                   "A century ago…" (9 → 10)
 *  ch01 → walk      scroll: the text moves up, "Habitat loss…" comes in, the tiger
 *                   walks in slowly from the left and stops; waits (11 → 12)
 *  walk → gone      scroll: the shot, with sound; an ink splash bursts on it, it
 *                   turns into its black-line version, the splash spreads while the
 *                   text fades, then everything fades to the empty page (12 → 15)
 */
function buildIntro(): HTMLElement {
  const section = html('section', 'scene intro');
  section.id = 'ch00';
  section.dataset.frames = '1–15';
  section.style.height = '330vh';
  const words = '<span class="intro__tiger">Tiger</span><span class="intro__trafficking">Trafficking</span>';
  section.innerHTML = `
    <span id="ch01" class="anchor" style="top: 45vh" aria-hidden="true"></span>
    <div class="scene__stage intro__stage">
      <div class="intro__zoom">
        <h1 class="intro__title display">${words}</h1>
        <div class="intro__title intro__title--head display" aria-hidden="true" style="background-image: url('${headUrl}')">${words}</div>
      </div>
      <div class="intro__veil" aria-hidden="true"></div>
      <div class="intro__hint" aria-hidden="true">
        <svg viewBox="0 0 134 67"><path d="M67 67L0 0H134L67 67Z" /></svg>
        <span>Scroll down</span>
      </div>

      <div class="ch01">
        <div class="opener__inner ch01__first">
          <h2 class="opener__title display" id="ch01-title">100,000 ~ 5,600</h2>
          <p class="opener__subtitle">Wild tigers a century ago</p>
          <p class="opener__body">A century ago, an estimated 100,000 tigers lived in the wild. In 2023, the estimate was about 5,600.</p>
        </div>
        <p class="opener__body opener__body--next ch01__second">Habitat loss and poaching have driven the decline. Seizure records reveal what happens to some of the tigers caught up in the illegal trade.</p>
        <div class="walker" aria-hidden="true">
          <div class="walker__rig">${walkRig()}</div>
          <img class="walker__shot" src="${shotUrl}" alt="" />
        </div>
        <img class="splash" src="${splashUrl}" alt="" aria-hidden="true" />
        <div class="intro__black" aria-hidden="true"></div>
        <span class="opener__number ch01__number">01.</span>
      </div>
    </div>`;
  const q = <T extends Element = HTMLElement>(sel: string) => section.querySelector(sel) as unknown as T;
  const zoom = q('.intro__zoom'), veil = q('.intro__veil'), hint = q('.intro__hint');
  const first = q('.ch01__first'), second = q('.ch01__second'), number = q('.ch01__number');
  const walker = q('.walker'), shot = q('.walker__shot'), splash = q('.splash'), black = q('.intro__black');
  const rig = q('.walker__rig');
  const poses = Array.from(rig.querySelectorAll<SVGGElement>('.walker__pose'));
  let shownPose = 0;
  const pose = (n: number) => {
    if (n === shownPose) return;
    poses[shownPose].style.display = 'none';
    poses[n].style.display = '';
    shownPose = n;
  };
  const menuBtn = document.querySelector<HTMLElement>('.menu-btn');

  // Storyboard frames are 1440×900; map them to the screen as "cover"
  const k = () => Math.max(vw() / 1440, vh() / 900);
  const fx = (x: number) => (vw() - 1440 * k()) / 2 + x * k();
  const fy = (y: number) => (vh() - 900 * k()) / 2 + y * k();
  const portrait = () => vh() > vw();
  // Walking tiger: 390×195 at the bottom (frames 11–12); bigger on phones
  const tigerW = () => (portrait() ? vw() * 0.62 : 390 * k());
  const tigerTop = () => vh() - tigerW() * 0.5 - (portrait() ? vh() * 0.06 : 0);
  const endX = () => (portrait() ? (vw() - tigerW()) / 2 : fx(678));

  const D = reduced ? 0.01 : 1;
  // One drawing every 1/12 s (comic, on twos) and the tiger moves exactly the 35 units its
  // drawings advance, so the paws never slide. It walks in from off-screen and stops on
  // drawing 1: the number of drawings is a whole number of cycles.
  const RATE = 12;
  const stepPx = () => (WALK_STEP / WALK_BOX.w) * tigerW();
  const drawings = () => Math.ceil((endX() + tigerW() * 0.5) / stepPx() / 6) * 6; // starts half off-screen
  const WALK = drawings() / RATE;
  const walkClock = { t: 0 };
  const renderWalk = () => {
    const n = Math.min(drawings(), Math.floor(walkClock.t * RATE + 1e-6));
    const x = endX() - (drawings() - n) * stepPx();
    gsap.set(walker, { x, y: tigerTop(), width: tigerW(), height: tigerW() * 0.47 });
    pose(n % 6); // drawing 1 when it stands still
  };
  // Splash: born on the tiger's shoulder (frame 12), then covers the centre (frame 13)
  const small = () => ({ size: portrait() ? vw() * 0.75 : 445 * k(), x: endX() + tigerW() * 0.64, y: tigerTop() + tigerW() * 0.1 });
  const big = () => ({ size: Math.max(vw(), vh()) * 3.2, x: vw() / 2, y: vh() / 2 }); // ink over the whole screen
  const grow = { p: 0 };
  const renderSplash = () => {
    const p = Math.floor(grow.p * 7) / 7; // spreads in 7 drawings
    const a = small(), b = big();
    const size = a.size + (b.size - a.size) * p, x = a.x + (b.x - a.x) * p, y = a.y + (b.y - a.y) * p;
    gsap.set(splash, { width: size, height: size, x: x - size / 2, y: y - size / 2 });
  };

  gsap.set([number, first, second, walker, splash, shot], { autoAlpha: 0 });
  if (menuBtn) gsap.set(menuBtn, { autoAlpha: 0 });
  renderWalk();

  const hintFrom = () => -(vh() * 0.22); // the tab drops out of the title
  const tl = gsap.timeline({ paused: true });
  tl.addLabel('hidden')
    .fromTo(zoom, { opacity: 0 }, { opacity: 0.2, duration: reduced ? 0.01 : 0.35, ease: 'none' }, reduced ? 0 : 0.6)   // frame 2 (after a beat on the empty page)
    .to(zoom, { opacity: 1, duration: reduced ? 0.01 : 0.6, ease: 'power1.out' })                    // frame 3
    .fromTo(hint, { y: hintFrom, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }, '-=0.15')
    .addLabel('in')
    .to(hint, { y: 67, opacity: 0, duration: 0.15 }, 'in')
    // 4 → 8: a small pull back (anticipation), then a fast zoom into the face
    .to(zoom, { scale: reduced ? 1 : 0.9, duration: 0.22 * D, ease: 'power2.out' }, 'in')
    // slow at first, then faster and faster (ease-in), much deeper
    .to(zoom, { scale: reduced ? 1 : 30, duration: 1.0 * D, ease: 'expo.in' }, `in+=${0.22 * D}`)
    .fromTo(veil, { opacity: 0 }, { opacity: 1, duration: 0.3 * D, ease: 'power2.in' }, `in+=${0.95 * D}`)
    // 9 → 10: number, then text, then the menu button; waits on "…the estimate was about 5,600."
    .to(number, { autoAlpha: 1, duration: 0.3 }, `in+=${1.3 * D}`)
    .fromTo(first, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '>-0.05')
    .to(menuBtn ?? {}, { autoAlpha: 1, duration: 0.4 }, '>')
    .addLabel('ch01')
    // 10 → 12: text up, "Habitat loss…" in, the tiger walks in slowly and stops; waits
    .to(first, { y: -vh() * 0.6, autoAlpha: 0, duration: 0.45 * D, ease: 'power2.in' }, 'ch01')
    .fromTo(second, { y: vh() * 0.4, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6 * D, ease: 'power3.out' }, `ch01+=${0.4 * D}`)
    .set(walker, { autoAlpha: 1 }, `ch01+=${0.6 * D}`)
    .to(walkClock, { t: WALK, duration: WALK * D, ease: 'none', onUpdate: renderWalk }, `ch01+=${0.6 * D}`)
    .addLabel('walk')
    // 12 → 13: the shot (with sound) — splash bursts, the tiger turns into its black-line version,
    // the splash spreads; then everything fades and only the background is left (14 → 15)
    .call(gunshot, [], 'walk+=0.02') // just after the hold, so it fires on the next scroll
    .call(renderSplash, [], 'walk+=0.02')
    .set(splash, { autoAlpha: 1 }, 'walk+=0.02')
    .fromTo(splash, { scale: 0.2 }, { scale: 1, duration: 0.17 * D, ease: 'steps(2)' }, 'walk+=0.02')
    .set(rig, { autoAlpha: 0 }, 'walk+=0.02')
    .set(shot, { autoAlpha: 1 }, 'walk+=0.02')
    .to(second, { autoAlpha: 0.25, duration: 0.5 * D }, `walk+=${0.3 * D}`)
    // it stays at its first size a moment, then zooms in until the ink covers the whole screen
    .fromTo(grow, { p: 0 }, { p: 1, duration: 0.55 * D, ease: 'power2.in', onUpdate: renderSplash }, `walk+=${0.75 * D}`)
    .fromTo(black, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 * D, ease: 'steps(2)' }, `walk+=${1.1 * D}`)
    .set([walker, splash, second, number], { autoAlpha: 0 }, `walk+=${1.35 * D}`)
    // then the black fades out, slow at first (ease-in), to the empty page (15)
    .to(black, { autoAlpha: 0, duration: 0.7 * D, ease: 'power2.in' }, `walk+=${1.5 * D}`)
    .addLabel('gone');

  registerScene({ section, tl, labels: ['hidden', 'in', 'ch01', 'walk', 'gone'], at: [-99, 0.15, 1.0, 1.9], cutBackFrom: 3, passAt: [3] });
  return section;
}

/** Inserts the intro, openers and placeholders before `before` (the closing section). */
export function buildStory(before: HTMLElement) {
  const intro = buildIntro();
  const frag = document.createDocumentFragment();
  frag.append(intro);
  for (const s of story) {
    if (s.kind === 'opener') frag.append(buildOpener(s));
    else if (s.kind === 'faces') frag.append(buildFaces());
    else if (s.kind === 'clock') frag.append(buildClock());
    else if (s.kind === 'years') frag.append(buildYears());
    else if (s.kind === 'parts') frag.append(buildParts());
    else if (s.kind === 'radar') frag.append(buildRadar());
    else if (s.kind === 'jailed') frag.append(buildJailed());
    else if (s.kind === 'seizures') frag.append(buildSeizures());
    else frag.append(buildPlaceholder(s as Placeholder));
  }
  before.before(frag);

  startEngine();
}
