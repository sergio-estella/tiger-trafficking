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
import { story, type From, type Opener, type Placeholder } from './content/chapters';
import headUrl from './assets/tiger-head.svg?url';
import walk1 from './assets/walk/frame-01.svg?url';
import walk2 from './assets/walk/frame-02.svg?url';
import walk3 from './assets/walk/frame-03.svg?url';
import walk4 from './assets/walk/frame-04.svg?url';
import shotUrl from './assets/walk/tiger-shot.svg?url';
import splashUrl from './assets/ink-splash.svg?url';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const vh = () => window.innerHeight;
const vw = () => window.innerWidth;

interface Stepped {
  section: HTMLElement;
  tl: gsap.core.Timeline;
  labels: string[];
  /** Thresholds in vh, relative to the section top: crossing the i-th one goes to labels[i + 1] */
  at: number[];
  index: number;
  tween?: gsap.core.Tween;
  /** Going back from this label index or later cuts instead of playing backwards (tiger animations) */
  cutBackFrom?: number;
  started?: boolean;
}

const scenes: Stepped[] = [];

function update() {
  const y = window.scrollY;
  for (const s of scenes) {
    const top = s.section.offsetTop;
    let index = 0;
    for (const a of s.at) if (y >= top + a * vh()) index++;
    if (index === s.index && s.started) continue;
    const back = index < s.index;
    const cut = (back && s.cutBackFrom !== undefined && s.index >= s.cutBackFrom)
      || (!s.started && index >= 2); // landing deep in the page (reload, menu link): no replay of earlier steps
    s.started = true;
    s.index = index;
    s.tween?.kill();
    if (cut) s.tl.pause().seek(s.labels[index]);
    else s.tween = s.tl.tweenTo(s.labels[index], { ease: 'none' });
  }
}

function offset(from: From) {
  switch (from) {
    case 'right': return { x: vw() * 0.75, y: 0 };
    case 'left': return { x: -vw() * 0.75, y: 0 };
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
  if (o.fromBlack) tl.fromTo(stage, { backgroundColor: '#000' }, { backgroundColor: 'var(--pale)', duration: D, ease: 'none' });
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

  scenes.push({ section, tl, labels, at, index: 0 });
  return section;
}

function buildPlaceholder(p: Placeholder): HTMLElement {
  const section = html('section', 'placeholder');
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
 * 00 · Intro + 01 (frames 1–15), one scene on one pale stage:
 *  hidden → in      title fades in (1 → 3) and waits
 *  in → ch01        scroll: zoom into the tiger's face until it disappears (4 → 8);
 *                   then "01.", the text and the menu button appear; waits on
 *                   "A century ago…" (9 → 10)
 *  ch01 → shot      scroll: the text moves up, the second paragraph comes in, the
 *                   tiger walks in from the left; an ink splash bursts on it, it
 *                   turns into its black-line version and the splash grows while
 *                   the text fades (11 → 13)
 *  shot → gone      scroll: splash and tiger go, the page is empty (14 → 15)
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
          ${[walk1, walk2, walk3, walk4].map((u, i) => `<img class="walker__frame" src="${u}" alt="" data-i="${i}" />`).join('')}
          <img class="walker__shot" src="${shotUrl}" alt="" />
        </div>
        <img class="splash" src="${splashUrl}" alt="" aria-hidden="true" />
        <span class="opener__number ch01__number">01.</span>
      </div>
    </div>`;
  const q = <T extends Element = HTMLElement>(sel: string) => section.querySelector(sel) as unknown as T;
  const zoom = q('.intro__zoom'), veil = q('.intro__veil'), hint = q('.intro__hint');
  const first = q('.ch01__first'), second = q('.ch01__second'), number = q('.ch01__number');
  const walker = q('.walker'), shot = q('.walker__shot'), splash = q('.splash');
  const frames = Array.from(section.querySelectorAll<HTMLElement>('.walker__frame'));
  const menuBtn = document.querySelector<HTMLElement>('.menu-btn');

  // Storyboard frames are 1440×900; map them to the screen as "cover"
  const k = () => Math.max(vw() / 1440, vh() / 900);
  const fx = (x: number) => (vw() - 1440 * k()) / 2 + x * k();
  const fy = (y: number) => (vh() - 900 * k()) / 2 + y * k();
  const portrait = () => vh() > vw();
  // Walking tiger: 390×195 at the bottom (frames 11–12); bigger on phones
  const tigerW = () => (portrait() ? vw() * 0.62 : 390 * k());
  const tigerTop = () => vh() - tigerW() * 0.5 - (portrait() ? vh() * 0.06 : 0);
  const startX = () => (portrait() ? -tigerW() * 0.7 : fx(20) - tigerW() * 0.55);
  const endX = () => (portrait() ? (vw() - tigerW()) / 2 : fx(678));

  const D = reduced ? 0.01 : 1;
  const FPS = 12;
  const held = (t: number) => Math.floor(t * FPS + 1e-6) / FPS;
  const WALK = 1.6;
  const walkClock = { t: 0 };
  const renderWalk = () => {
    const tq = held(walkClock.t);
    const u = Math.min(1, tq / WALK);
    gsap.set(walker, { x: startX() + (endX() - startX()) * u, y: tigerTop(), width: tigerW(), height: tigerW() * 0.47 });
    const f = Math.floor(tq * 8) % 4; // 4 drawings, 8 per second
    frames.forEach((img, i) => { img.style.visibility = i === f ? 'visible' : 'hidden'; });
  };
  // Splash: born on the tiger's shoulder (frame 12), then covers the centre (frame 13)
  const small = () => ({ size: portrait() ? vw() * 0.75 : 445 * k(), x: endX() + tigerW() * 0.64, y: tigerTop() + tigerW() * 0.1 });
  const big = () => ({ size: portrait() ? vh() * 1.1 : 1309 * k(), x: portrait() ? vw() / 2 : fx(785), y: portrait() ? vh() * 0.5 : fy(526) });
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

  const tl = gsap.timeline({ paused: true });
  tl.addLabel('hidden')
    .fromTo(zoom, { opacity: 0 }, { opacity: 0.2, duration: reduced ? 0.01 : 0.35, ease: 'none' })   // frame 2
    .to(zoom, { opacity: 1, duration: reduced ? 0.01 : 0.6, ease: 'power1.out' })                    // frame 3
    .fromTo(hint, { y: 67, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' })
    .addLabel('in')
    .to(hint, { y: 67, opacity: 0, duration: 0.2 }, 'in')
    // 4 → 8: into the tiger's face until it disappears
    .to(zoom, { scale: reduced ? 1 : 9, duration: 1.4 * D, ease: 'power2.in' }, 'in')
    .fromTo(veil, { opacity: 0 }, { opacity: 1, duration: 0.9 * D, ease: 'power1.in' }, `in+=${0.5 * D}`)
    // 9 → 10: number, then text, then the menu button
    .to(number, { autoAlpha: 1, duration: 0.3 }, `in+=${1.45 * D}`)
    .fromTo(first, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '>-0.05')
    .to(menuBtn ?? {}, { autoAlpha: 1, duration: 0.4 }, '>')
    .addLabel('ch01')
    // 10 → 11: text up, second paragraph in
    .to(first, { y: -vh() * 0.6, autoAlpha: 0, duration: 0.45 * D, ease: 'power2.in' }, 'ch01')
    .fromTo(second, { y: vh() * 0.4, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6 * D, ease: 'power3.out' }, `ch01+=${0.4 * D}`) // after the first text has left
    // 11 → 12: the tiger walks in
    .set(walker, { autoAlpha: 1 }, `ch01+=${0.6 * D}`)
    .to(walkClock, { t: WALK, duration: WALK * D, ease: 'none', onUpdate: renderWalk }, `ch01+=${0.6 * D}`)
    // 12: the shot — splash bursts, the tiger turns into its black-line version
    .addLabel('hit', `ch01+=${(0.6 + WALK) * D}`)
    .call(renderSplash, [], 'hit')
    .set(splash, { autoAlpha: 1 }, 'hit')
    .fromTo(splash, { scale: 0.2 }, { scale: 1, duration: 0.17 * D, ease: `steps(2)` }, 'hit')
    .set(frames, { autoAlpha: 0 }, 'hit')
    .set(shot, { autoAlpha: 1 }, 'hit')
    // 12 → 13: the splash spreads over the centre, the text fades
    .fromTo(grow, { p: 0 }, { p: 1, duration: 0.6 * D, ease: 'power1.in', onUpdate: renderSplash }, `hit+=${0.35 * D}`)
    .to(second, { autoAlpha: 0.25, duration: 0.5 * D }, `hit+=${0.35 * D}`)
    .addLabel('shot')
    // 14 → 15: everything goes, empty page
    .to([walker, splash], { autoAlpha: 0, duration: 0.5 * D }, 'shot')
    .to([second, number], { autoAlpha: 0, duration: 0.4 * D }, 'shot')
    .addLabel('gone');

  scenes.push({ section, tl, labels: ['hidden', 'in', 'ch01', 'shot', 'gone'], at: [-99, 0.15, 1.0, 1.9], index: 0, cutBackFrom: 3 });
  return section;
}

/** Inserts the intro, openers and placeholders before `before` (the closing section). */
export function buildStory(before: HTMLElement) {
  const intro = buildIntro();
  const frag = document.createDocumentFragment();
  frag.append(intro);
  for (const s of story) frag.append(s.kind === 'opener' ? buildOpener(s) : buildPlaceholder(s));
  before.before(frag);

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}
