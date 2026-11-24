// Builds src/data/map-countries.json: Natural Earth 1:50m countries (world-atlas,
// public domain) clipped to the closing map's region, coordinates rounded.
// Keeps the page light (the full world file is ~750 kB).
// Run: node scripts/build-map-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { feature, quantize } from 'topojson-client';
import { geoBounds } from 'd3-geo';
import { topology } from 'topojson-server';
import { presimplify, simplify as tsimplify } from 'topojson-simplify';

const world = JSON.parse(readFileSync('node_modules/world-atlas/countries-50m.json', 'utf8'));
const all = feature(world, world.objects.countries).features;
const [W, S, E, N] = [40, -25, 165, 75]; // generous box around the framing (64–143°E, 11°S–54°N)

// The map is ~1000 px wide for ~80° of longitude (≈0.08° per px): a 0.04° grid is invisible.
const STEP = 0.04;
const snap = (v) => Math.round(Math.round(v / STEP) * STEP * 100) / 100;
const ring = (r) => {
  const out = [];
  for (const [x, y] of r) {
    const p = [snap(x), snap(y)];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  return out.length >= 4 ? out : null;
};
const polygon = (rings) => { const rs = rings.map(ring); return rs[0] ? rs.filter(Boolean) : null; };
const simplify = (g) => g.type === 'Polygon'
  ? { type: 'Polygon', coordinates: polygon(g.coordinates) }
  : { type: 'MultiPolygon', coordinates: g.coordinates.map(polygon).filter(Boolean) };
const keep = all.filter((f) => {
  const [[x0, y0], [x1, y1]] = geoBounds(f);
  const crossesAntimeridian = x0 > x1;
  return y1 >= S && y0 <= N && (crossesAntimeridian || (x1 >= W && x0 <= E));
});
const out = {
  type: 'FeatureCollection',
  features: keep.map((f) => ({ type: 'Feature', id: f.id, properties: { name: f.properties.name }, geometry: simplify(f.geometry) })).filter((f) => f.geometry.coordinates && f.geometry.coordinates.length),
};
// TopoJSON: shared borders, quantised and delta-encoded; light simplification below screen resolution
const MIN_WEIGHT = 0.003; // planar triangle area in deg² (~0.5 px² on screen) below which a vertex is dropped
let topo = tsimplify(presimplify(topology({ countries: out })), MIN_WEIGHT);
// strip the weight coordinate, then quantise + delta-encode
topo.arcs = topo.arcs.map((arc) => arc.map(([x, y]) => [x, y])); // simplify() already dropped the vertices
topo = quantize(topo, 1e4);
writeFileSync('src/data/map-countries.json', JSON.stringify(topo));
console.log(keep.length, 'countries,', JSON.stringify(topo).length, 'bytes');
