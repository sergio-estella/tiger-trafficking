/**
 * Step model: the reader moves from one resting point to the next, never in
 * between. One gesture (a wheel flick, a swipe, a key) = one step; the page
 * glides to the next stop and that step's animation plays in full. While it
 * plays, gestures are ignored. Trackpad inertia is not a new gesture.
 *
 * Stops come from the scene engine (src/engine.ts: one per scene step) plus the
 * closing. Dragging the scrollbar or following a link still works: when the
 * page comes to rest somewhere else, it settles on the nearest stop.
 */
import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { getStops, isBusy, markBusy } from './engine';

gsap.registerPlugin(ScrollToPlugin);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const GLIDE = reduced ? 0 : 0.7;      // seconds to travel between two stops
const QUIET_MS = 180;                  // a wheel pause this long starts a new gesture
const WHEEL_PX = 12;                   // distance a wheel/trackpad gesture needs to count
const SWIPE_PX = 40;

let gliding = false;
const menuOpen = () => !(document.querySelector<HTMLElement>('#menu')?.hidden ?? true);

function goTo(y: number, then?: () => void) {
  gliding = true;
  markBusy(GLIDE + 0.05);
  gsap.to(window, {
    scrollTo: { y, autoKill: false }, duration: GLIDE, ease: 'power2.inOut', overwrite: true,
    onComplete: () => { gliding = false; then?.(); },
  });
}

/** Waits until the step's animation has played, then runs `fn` */
function whenIdle(fn: () => void) {
  const check = () => (isBusy() ? window.setTimeout(check, 50) : fn());
  window.setTimeout(check, 60);
}

export function step(dir: 1 | -1, force = false) {
  if ((!force && isBusy()) || menuOpen()) return;
  const y = window.scrollY;
  const stops = getStops();
  if (dir > 0) {
    const target = stops.find((s) => s.y > y + 4);
    // an exit: let it play, then carry on to the next resting point in the same gesture
    if (target) goTo(target.y, target.pass ? () => whenIdle(() => step(1, true)) : undefined);
  } else {
    // going back skips exits
    const target = [...stops].reverse().find((s) => s.y < y - 4 && !s.pass);
    if (target) goTo(target.y);
  }
}

export function startStepper() {
  // Wheel / trackpad: block native scrolling and turn each gesture into one step.
  // Trackpads start a gesture with tiny deltas (1–2 px) and keep sending
  // decaying "momentum" events for a second or more after the fingers lift:
  // - a gesture is armed after a quiet gap, and fires once its accumulated
  //   distance passes a small threshold (so tiny first deltas still count);
  // - momentum after it is ignored, unless the deltas jump up again (a new
  //   flick during the momentum).
  let last = 0, prevAbs = 0, acc = 0, armed = true;
  window.addEventListener('wheel', (e) => {
    if (menuOpen() || e.ctrlKey) return; // pinch-zoom stays native
    e.preventDefault();
    const now = performance.now();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
    const abs = Math.abs(dy);
    if (now - last > QUIET_MS) { armed = true; acc = 0; }
    else if (!armed && abs > 25 && abs > prevAbs * 2.5) { armed = true; acc = 0; }
    last = now;
    prevAbs = abs;
    if (!armed) return;
    acc += dy;
    if (Math.abs(acc) >= WHEEL_PX) {
      armed = false;
      step(acc > 0 ? 1 : -1);
    }
  }, { passive: false });

  // Touch: one vertical swipe = one step; horizontal drags (the map) are left alone
  let sx = 0, sy = 0;
  window.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', (e) => { if (!menuOpen()) e.preventDefault(); }, { passive: false });
  window.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dy) > SWIPE_PX && Math.abs(dy) > Math.abs(dx) * 1.2) step(dy < 0 ? 1 : -1);
  }, { passive: true });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (menuOpen() || e.altKey || e.metaKey || e.ctrlKey) return;
    const t = e.target as HTMLElement;
    if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    const next = ['ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.shiftKey);
    const prev = ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey);
    if (next || prev) { e.preventDefault(); step(next ? 1 : -1); }
    if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    if (e.key === 'End') { e.preventDefault(); goTo(getStops().at(-1)?.y ?? 0); }
  });

  // Scrollbar drags and anchor jumps: settle on the nearest stop once the page rests
  let idle = 0;
  window.addEventListener('scroll', () => {
    if (gliding) return;
    clearTimeout(idle);
    idle = window.setTimeout(() => {
      if (gliding || menuOpen()) return;
      const y = window.scrollY;
      const stops = getStops().filter((s) => !s.pass).map((s) => s.y);
      const nearest = stops.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a), stops[0]);
      if (Math.abs(nearest - y) > 3) goTo(nearest);
    }, 220);
  }, { passive: true });
}
