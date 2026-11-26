/**
 * "One face per year" — a tiger head split into one cell per tiger part.
 *
 * Weighted Voronoi map (d3-voronoi-map): each cell's area is proportional to
 * the number of seizures that contained that part. The head outline is the one
 * drawn in the storyboard. Seeds start where each part sits in the storyboard
 * head (ears = live / dead tigers, jaw = teeth, meat, paws) so every head reads
 * the same way. Shared by the story scene and the dashboard.
 */
import { voronoiMapSimulation } from 'd3-voronoi-map';
import { polygonCentroid, polygonHull, polygonArea } from 'd3-polygon';
import { PARTS, type PartKey } from '../data/series';

export type Pt = [number, number];
export interface Cell {
  key: PartKey;
  /** Cell cut to the head outline (for centroids, hit areas and the burst) */
  polygon: Pt[];
  /** Convex Voronoi cell before the cut (drawn inside a clip path: clean borders) */
  raw: Pt[];
  centroid: Pt;
  value: number;
}

// Head outline from the storyboard (36.96 × 37.30 units)
const OUTLINE: Pt[] = [
  [18.48, 7.39], [12.88, 6.27], [9.97, 4.82], [7.06, 0], [3.7, 3.7], [2.24, 9.52], [2.58, 15.12], [0, 22.18],
  [2.58, 25.87], [5.6, 30.69], [10.3, 34.72], [15.12, 36.74], [18.48, 37.3], [21.84, 36.74], [26.66, 34.72],
  [31.36, 30.69], [34.38, 25.87], [36.96, 22.18], [34.38, 15.12], [34.72, 9.52], [33.26, 3.7], [29.9, 0],
  [26.99, 4.82], [24.08, 6.27],
];
export const HEAD_ASPECT = 37.3 / 36.96; // height / width

/** Head outline scaled to a box of width w (counter-clockwise, as d3 expects) */
export function headOutline(w: number): Pt[] {
  const s = w / 36.96;
  return OUTLINE.map(([x, y]) => [x * s, y * s] as Pt).reverse();
}

/**
 * Sutherland–Hodgman: clips `subject` (any polygon, here the concave head) with
 * a convex `clip` polygon (a Voronoi cell). Robust for tiny heads, no library.
 */
function clipConvex(subject: Pt[], clip: Pt[]): Pt[] {
  // orientation of the clip polygon decides which side of each edge is "inside"
  // (d3's polygonArea is positive for counter-clockwise rings in screen coordinates, the opposite of the shoelace sign)
  const sign = -Math.sign(polygonArea(clip)) || 1;
  const inside = (p: Pt, a: Pt, b: Pt) => sign * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= 0;
  const cross = (p: Pt, q: Pt, a: Pt, b: Pt): Pt => {
    const a1 = q[1] - p[1], b1 = p[0] - q[0], c1 = a1 * p[0] + b1 * p[1];
    const a2 = b[1] - a[1], b2 = a[0] - b[0], c2 = a2 * a[0] + b2 * a[1];
    const det = a1 * b2 - a2 * b1 || 1e-9;
    return [(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det];
  };
  let out = subject;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j], q = input[(j + 1) % input.length];
      const pin = inside(p, a, b), qin = inside(q, a, b);
      if (pin) out.push(p);
      if (pin !== qin) out.push(cross(p, q, a, b));
    }
  }
  return out;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Cells of a head of width w for the given counts (parts with 0 get no cell).
 * Cutting the notch costs the ear cells some area, so the map is recomputed up
 * three times with weights corrected by (wanted share / drawn share).
 */
export function voronoiHead(values: Record<PartKey, number>, w: number, seed = 7): Cell[] {
  let weights = { ...values };
  let cells = voronoiOnce(weights, w, seed);
  for (let pass = 0; pass < 3 && cells.length > 1; pass++) {
    const total = cells.reduce((s, c) => s + Math.abs(polygonArea(c.polygon)), 0);
    const want = cells.reduce((s, c) => s + values[c.key], 0);
    const next = { ...weights };
    for (const c of cells) next[c.key] = weights[c.key] * ((values[c.key] / want) / (Math.abs(polygonArea(c.polygon)) / total));
    weights = next;
    cells = voronoiOnce(weights, w, seed);
  }
  return cells.map((c) => ({ ...c, value: values[c.key] }));
}

function voronoiOnce(values: Record<PartKey, number>, w: number, seed: number): Cell[] {
  const h = w * HEAD_ASPECT;
  type Datum = { key: PartKey | 'notch'; value: number; seed: [number, number] };
  const data: Datum[] = PARTS.filter((p) => values[p.key] > 0).map((p) => ({ key: p.key, value: values[p.key], seed: p.seed }));
  if (data.length === 0) return [];
  // The Voronoi map needs a convex clip: compute it in the head's hull, then cut
  // every cell with the real (concave) outline, so the ears keep their notch.
  const outline = headOutline(w);
  const hull = polygonHull(outline) as Pt[];
  const sim = voronoiMapSimulation(data)
    .weight((d: Datum) => d.value)
    .clip(hull)
    .initialPosition((d: Datum) => [d.seed[0] * w, d.seed[1] * h])
    .prng(mulberry32(seed))
    .maxIterationCount(400)
    .convergenceRatio(0.002)
    .stop();
  let state = sim.state();
  while (!state.ended) { sim.tick(); state = sim.state(); }
  const out: Cell[] = [];
  for (const poly of state.polygons as (Pt[] & { site: { originalObject: { data: { originalData: Datum } } } })[]) {
    const d = poly.site.originalObject.data.originalData;
    if (d.key === 'notch') continue;
    const ring = poly.map((p) => [p[0], p[1]] as Pt);
    const polygon = clipConvex(outline, ring);
    if (polygon.length < 3) continue;
    out.push({ key: d.key as PartKey, value: d.value, polygon, raw: ring, centroid: polygonCentroid(polygon) as Pt });
  }
  return out;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

/** Hatch pattern for live tigers (black / white diagonal stripes) */
export function hatchDefs(id: string, size = 6) {
  const defs = svgEl('defs');
  const pat = svgEl('pattern', { id, width: size, height: size, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pat.append(svgEl('rect', { width: size, height: size, fill: '#fff' }), svgEl('rect', { width: size / 2, height: size, fill: '#111' }));
  defs.append(pat);
  return defs;
}

export const cellFill = (key: PartKey, hatchId: string) =>
  key === 'Live_tigers' ? `url(#${hatchId})` : PARTS.find((p) => p.key === key)!.color;

export const pathD = (poly: Pt[]) => 'M' + poly.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z';

let clipCount = 0;

export interface DrawnHead {
  paths: Map<PartKey, SVGPathElement>;
  /** Pieces mode for the burst: cut polygons, no clip path. false = clean head */
  setPieces(on: boolean): void;
}

/** Draws a head into `g`: one path per cell inside a head-shaped clip, plus the outline. */
export function drawHead(g: SVGGElement, cells: Cell[], w: number, opts: { hatchId: string; stroke?: number; dashed?: boolean }): DrawnHead {
  const id = `head-clip-${++clipCount}`;
  const defs = svgEl('defs');
  const cp = svgEl('clipPath', { id });
  cp.append(svgEl('path', { d: pathD(headOutline(w)) }));
  defs.append(cp);
  const inner = svgEl('g', { 'clip-path': `url(#${id})` });
  g.append(defs, inner);
  const paths = new Map<PartKey, SVGPathElement>();
  const sw = (opts.stroke ?? 1.5) * 0.6;
  for (const c of cells) {
    const p = svgEl('path', { d: pathD(c.raw), fill: cellFill(c.key, opts.hatchId), class: 'face-cell', 'data-part': c.key });
    p.style.stroke = '#111';
    p.style.strokeWidth = String(sw);
    p.style.strokeLinejoin = 'round';
    inner.append(p);
    paths.set(c.key, p);
  }
  const outline = svgEl('path', { d: pathD(headOutline(w)), fill: 'none', class: 'face-outline' });
  outline.style.stroke = '#111';
  outline.style.strokeWidth = String(opts.stroke ?? 1.5);
  outline.style.strokeLinejoin = 'round';
  if (opts.dashed) outline.style.strokeDasharray = '3 2';
  g.append(outline);
  let pieces = false;
  return {
    paths,
    setPieces(on) {
      if (on === pieces) return;
      pieces = on;
      if (on) inner.removeAttribute('clip-path'); else inner.setAttribute('clip-path', `url(#${id})`);
      for (const c of cells) paths.get(c.key)!.setAttribute('d', pathD(on ? c.polygon : c.raw));
      outline.style.opacity = on ? '0' : '1';
    },
  };
}
