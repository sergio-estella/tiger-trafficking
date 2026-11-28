/**
 * 04 · What was seized: the parts (frames 57–62).
 *
 *  hidden → in   a checkerboard drops in, square by square (57), and each square
 *                gets its part: skin, skull, tooth, claw, bone, paw, ribs, vertebra
 *                (58–60); HOLD
 *  in → out      a pale circle opens in the middle and swallows the board (61–62);
 *                the page carries on to the radar
 */
import { gsap } from 'gsap';
import { registerScene } from '../engine';
import skin from '../assets/ch04/part-skin.png';
import skull from '../assets/ch04/part-skull.svg';
import tooth from '../assets/ch04/part-tooth.svg';
import claw from '../assets/ch04/part-claw.svg';
import bone from '../assets/ch04/part-bone.svg';
import paw from '../assets/ch04/part-paw.png';
import ribs from '../assets/ch04/part-ribs.svg';
import vertebra from '../assets/ch04/part-vertebra.png';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FPS = 12;

// order and square colour as drawn in frame 60
const TILES = [
  { src: skin, label: 'skins', dark: false }, { src: skull, label: 'skulls', dark: true },
  { src: tooth, label: 'teeth', dark: false }, { src: claw, label: 'claws', dark: true },
  { src: bone, label: 'bones', dark: true }, { src: paw, label: 'paws', dark: false },
  { src: ribs, label: 'ribs', dark: true }, { src: vertebra, label: 'vertebrae', dark: false },
];

export function buildParts(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'scene parts';
  section.dataset.frames = '57–62';
  section.style.height = '230vh';
  section.setAttribute('aria-label', 'What was seized: skins, skulls, teeth, claws, bones, paws, ribs, vertebrae');
  section.innerHTML = `
    <div class="scene__stage parts__stage">
      <div class="parts__grid">
        ${TILES.map((t) => `<figure class="parts__tile${t.dark ? ' is-dark' : ''}"><img src="${t.src}" alt="" /><figcaption>${t.label}</figcaption></figure>`).join('')}
      </div>
      <svg class="parts__wipe" aria-hidden="true"><circle r="0" /></svg>
    </div>`;
  const tiles = Array.from(section.querySelectorAll<HTMLElement>('.parts__tile'));
  const imgs = tiles.map((t) => t.querySelector('img')!);
  const caps = tiles.map((t) => t.querySelector('figcaption')!);
  const circle = section.querySelector<SVGCircleElement>('.parts__wipe circle')!;

  const D = reduced ? 0.01 : 1;
  const wipe = { r: 0 };
  const renderWipe = () => {
    const W = window.innerWidth, H = window.innerHeight;
    const r = Math.round(wipe.r * 8) / 8; // 8 sizes: comic steps
    circle.setAttribute('cx', String(W / 2));
    circle.setAttribute('cy', String(H / 2));
    circle.setAttribute('r', String(r * (Math.hypot(W, H) / 2 + 10)));
  };

  // squares drop in a scattered order, on twos
  const order = [5, 2, 7, 0, 3, 6, 1, 4];
  const tl = gsap.timeline({ paused: true });
  tl.addLabel('hidden')
    .fromTo(order.map((i) => tiles[i]), { autoAlpha: 0, scale: 1.25 }, { autoAlpha: 1, scale: 1, duration: 0.17 * D, ease: 'steps(2)', stagger: 0.08 * D }, 0)
    .fromTo(order.map((i) => imgs[i]), { scale: 0, rotation: -12 }, { scale: 1, rotation: 0, duration: 0.25 * D, ease: `steps(${Math.round(0.25 * FPS)})`, stagger: 0.09 * D }, 0.55 * D)
    .fromTo(caps, { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.03 }, 1.4 * D)
    .addLabel('in')
    .to(caps, { opacity: 0, duration: 0.1 }, 'in+=0.01')
    .fromTo(wipe, { r: 0 }, { r: 1, duration: 0.7 * D, ease: 'power2.in', onUpdate: renderWipe, immediateRender: false }, 'in+=0.01')
    .set(tiles, { autoAlpha: 0 }, `in+=${0.72 * D}`)
    .addLabel('out');
  renderWipe();
  window.addEventListener('resize', renderWipe);

  registerScene({ section, tl, labels: ['hidden', 'in', 'out'], at: [-0.35, 1.0], cutBackFrom: 2, passAt: [1] });
  return section;
}
