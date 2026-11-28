/**
 * Places a tooltip next to what it describes without covering it, nor anything
 * else that must stay readable (legends, notes). Tries the sides in order and
 * keeps the first that fits on screen; falls back to the first, clamped.
 * Coordinates are viewport pixels: the stages are full-screen and sticky.
 */
export type Side = 'right' | 'left' | 'above' | 'below';

const hits = (a: DOMRect, b: DOMRect, m: number) =>
  a.left < b.right + m && a.right > b.left - m && a.top < b.bottom + m && a.bottom > b.top - m;

export function placeTip(tip: HTMLElement, anchor: DOMRect, avoid: (DOMRect | null | undefined)[], order: Side[], gap = 14) {
  const W = window.innerWidth, H = window.innerHeight;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  const cx = anchor.left + anchor.width / 2, cy = anchor.top + anchor.height / 2;
  const clampX = (x: number) => Math.min(W - w - 8, Math.max(8, x));
  const clampY = (y: number) => Math.min(H - h - 8, Math.max(8, y));
  const at = (s: Side) => {
    switch (s) {
      case 'right': return { x: anchor.right + gap, y: clampY(cy - h / 2) };
      case 'left': return { x: anchor.left - gap - w, y: clampY(cy - h / 2) };
      case 'above': return { x: clampX(cx - w / 2), y: anchor.top - gap - h };
      default: return { x: clampX(cx - w / 2), y: anchor.bottom + gap };
    }
  };
  const blockers = [anchor, ...avoid.filter((r): r is DOMRect => !!r && r.width > 0)];
  let best = at(order[0]);
  let found = false;
  for (const s of [...order, ...(['right', 'left', 'above', 'below'] as Side[]).filter((o) => !order.includes(o))]) {
    const p = at(s);
    const r = new DOMRect(p.x, p.y, w, h);
    if (p.x < 8 || p.y < 8 || p.x + w > W - 8 || p.y + h > H - 8) continue;
    if (blockers.some((b) => hits(r, b, 6))) continue;
    best = p; found = true; break;
  }
  if (!found) best = { x: clampX(best.x), y: clampY(best.y) };
  Object.assign(tip.style, { left: `${best.x}px`, top: `${best.y}px`, right: 'auto', bottom: 'auto' });
}
