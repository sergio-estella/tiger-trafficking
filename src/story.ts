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
}

const scenes: Stepped[] = [];

function update() {
  const y = window.scrollY;
  for (const s of scenes) {
    const top = s.section.offsetTop;
    let index = 0;
    for (const a of s.at) if (y >= top + a * vh()) index++;
    if (index === s.index) continue;
    s.index = index;
    s.tween?.kill();
    s.tween = s.tl.tweenTo(s.labels[index], { ease: 'none' });
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
 * 00 · Intro (frames 1–8). The title fades in (1 → 2 → 3) with a tiger head
 * showing through the letters; scrolling zooms into the head until everything
 * dissolves into the pale background (4 → 8), where chapter 01 begins.
 */
function buildIntro(): HTMLElement {
  const section = html('section', 'scene intro');
  section.id = 'ch00';
  section.dataset.frames = '1–8';
  section.style.height = '190vh';
  const words = '<span class="intro__tiger">Tiger</span><span class="intro__trafficking">Trafficking</span>';
  section.innerHTML = `
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
    </div>`;
  const zoom = section.querySelector<HTMLElement>('.intro__zoom')!;
  const veil = section.querySelector<HTMLElement>('.intro__veil')!;
  const hint = section.querySelector<HTMLElement>('.intro__hint')!;

  const tl = gsap.timeline({ paused: true });
  tl.addLabel('hidden')
    .fromTo(zoom, { opacity: 0 }, { opacity: 0.2, duration: reduced ? 0.01 : 0.35, ease: 'none' })   // frame 2
    .to(zoom, { opacity: 1, duration: reduced ? 0.01 : 0.6, ease: 'power1.out' })                    // frame 3
    .fromTo(hint, { y: 67, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' })
    .addLabel('in')
    .to(hint, { y: 67, opacity: 0, duration: 0.2 }, 'in')
    // 4 → 8: into the tiger's face, dissolving into the pale background
    .to(zoom, { scale: reduced ? 1 : 9, duration: reduced ? 0.01 : 1.4, ease: 'power2.in' }, 'in')
    .fromTo(veil, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.3 : 0.9, ease: 'power1.in' }, reduced ? 'in' : 'in+=0.5')
    .addLabel('zoom');

  // 'in' plays on load (threshold far above); the zoom starts after a short scroll
  scenes.push({ section, tl, labels: ['hidden', 'in', 'zoom'], at: [-99, 0.15], index: 0 });
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
