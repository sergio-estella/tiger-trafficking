/**
 * Explorable map (frame 93 · HOLD · EXPLORE).
 *
 * Country shapes come from Natural Earth (world-atlas, public domain) instead
 * of the Figma export, where land, stripes and extinct countries are one
 * bitmap and cannot be made interactive.
 *
 * Interaction never advances the story: selecting a country only updates the
 * card. On mobile the map pans horizontally only (native overflow-x), so the
 * vertical gesture always scrolls the page.
 */
import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
// Natural Earth 1:50m, clipped to the region and quantised (see scripts/build-map-data.mjs)
import mapData from './data/map-countries.json';
import { byId, countries, DEFAULT_COUNTRY, VERIFIED, type Country } from './data/countries';

const W = 1000;
const H = 900;
const SVG_NS = 'http://www.w3.org/2000/svg';
const fmt = new Intl.NumberFormat('en-GB');

export interface MapApi {
  /** Fired on any reader interaction (hint hides while the reader explores) */
  onInteract(cb: () => void): void;
  /** Mobile: scroll the map horizontally so the given country is in view */
  reveal(id: string): void;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

export function createMap(root: HTMLElement): MapApi {
  const pan = root.querySelector<HTMLElement>('.map__pan')!;
  const card = root.querySelector<HTMLElement>('.map-card')!;
  const legend = root.querySelector<HTMLElement>('.map-legend')!;
  const listeners: Array<() => void> = [];
  const interacted = () => listeners.forEach((f) => f());

  const topo = mapData as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const all = feature(topo, topo.objects.countries).features;
  const range = new Set(countries.map((c) => c.id));

  // Framing as in the storyboard: India (west) to Indonesia (south), Russian Far East (north-east)
  const frame: GeoPermissibleObjects = { type: 'MultiPoint', coordinates: [[64, 54], [143, -11]] };
  const projection = geoMercator().fitSize([W, H], frame);
  const path = geoPath(projection);

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'map__svg', role: 'group', 'aria-label': 'Map of tiger range countries' });
  const defs = el('defs');
  const landClip = el('clipPath', { id: 'range-land' });
  defs.append(landClip);
  svg.append(defs);

  const gOutside = el('g', { class: 'map__outside' });
  const gRange = el('g', { class: 'map__range' });
  const gStripes = el('g', { class: 'map__stripes', 'clip-path': 'url(#range-land)', 'aria-hidden': 'true' });
  const gMarkers = el('g', { class: 'map__markers', 'aria-hidden': 'true' });
  const gLabels = el('g', { class: 'map__labels', 'aria-hidden': 'true' });
  svg.append(gOutside, gRange, gStripes, gMarkers, gLabels);

  const shapes = new Map<string, SVGPathElement>();
  for (const f of all) {
    const d = path(f);
    if (!d) continue;
    const id = String(f.id);
    if (range.has(id)) {
      const c = byId.get(id)!;
      const p = el('path', {
        d, class: `country country--${c.status}`, 'data-id': id,
        tabindex: 0, role: 'button', 'aria-label': `${c.name}: show figures`,
      });
      gRange.append(p);
      shapes.set(id, p);
      landClip.append(el('path', { d }));
    } else {
      gOutside.append(el('path', { d, class: 'country country--outside' }));
    }
  }

  // Decorative stripes inside the land (placeholder for the Figma decoration:
  // "The tiger inside the land is decoration."). Zigzag band across India–China.
  const zig: Array<[number, number]> = [];
  for (let lon = 66, i = 0; lon <= 124; lon += 4.2, i++) zig.push([lon, i % 2 ? 22 : 33]);
  const zigD = 'M' + zig.map((ll) => projection(ll)!.map((v) => v.toFixed(1)).join(',')).join('L');
  gStripes.append(el('path', { d: zigD, class: 'map__stripe' }));

  // Markers and labels
  const k = W / 1000; // marker sizes are px at the storyboard scale, map ~1000 px wide there
  for (const c of countries) {
    const [x, y] = projection(c.marker)!;
    const r = (c.markerSize / 2) * k;
    if (c.status === 'wild') {
      gMarkers.append(el('circle', { cx: x, cy: y, r, class: 'marker marker--wild', 'data-id': c.id }));
    } else {
      const g = el('g', { class: 'marker marker--extinct', transform: `translate(${x} ${y})` });
      g.append(el('circle', { r: 10 }));
      g.append(el('path', { d: 'M-4,-4L4,4M4,-4L-4,4' }));
      gMarkers.append(g);
    }
    const dx = (c.labelSide === 'right' ? 1 : -1) * (Math.max(r, 10) + 6);
    const label = el('text', { x: x + dx, y: y + 5, 'text-anchor': c.labelSide === 'right' ? 'start' : 'end', class: 'map__label' });
    label.textContent = c.name.toUpperCase();
    gLabels.append(label);
  }

  pan.append(svg);

  // --- Card -----------------------------------------------------------------
  const pending = '<span class="map-card__pending">pending</span>';
  const n = (v: number | null) => (v == null ? pending : fmt.format(v));

  function renderCard(c: Country) {
    const wild = c.status === 'extinct'
      ? 'No wild tigers left (2023)'
      : `${n(c.wildTigers2023)} wild tigers (2023)`;
    const whole = c.pctWhole2020to2025 == null ? '' : ` · ${c.pctWhole2020to2025}% with whole animals`;
    card.querySelector('.map-card__title')!.textContent = c.name.toUpperCase();
    card.querySelector('.map-card__body')!.innerHTML = `
      <p class="map-card__wild">${wild}</p>
      <hr />
      <p>${n(c.seizures2000to2025)} seizures · ${n(c.tigersSeized2000to2025)} tigers seized</p>
      <p class="map-card__period">2000 – June 2025</p>
      <p>${n(c.seizures2020to2025)} seizures in 2020–25${whole}</p>
      <p class="map-card__jailed">${n(c.peopleJailed2000to2021)} people jailed, 2000–2021</p>
      ${VERIFIED ? '' : '<p class="map-card__draft">Prototype · figures pending verification</p>'}`;
  }

  function select(id: string, { open = true } = {}) {
    shapes.forEach((p, pid) => p.classList.toggle('is-selected', pid === id));
    gMarkers.querySelectorAll<SVGElement>('[data-id]').forEach((m) => m.classList.toggle('is-selected', m.dataset.id === id));
    renderCard(byId.get(id)!);
    if (open) card.classList.add('is-open');
  }

  for (const [id, p] of shapes) {
    p.addEventListener('click', () => { select(id); interacted(); });
    p.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); interacted(); }
    });
    // Hover previews on devices that can hover (desktop); touch uses tap
    p.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { select(id); interacted(); } });
  }

  card.querySelector('.map-card__close')!.addEventListener('click', () => { card.classList.remove('is-open'); interacted(); });

  // Mobile legend: collapsible bottom sheet
  const toggle = legend.querySelector<HTMLButtonElement>('.map-legend__toggle')!;
  toggle.addEventListener('click', () => {
    const open = legend.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    interacted();
  });

  pan.addEventListener('scroll', interacted, { passive: true });

  select(DEFAULT_COUNTRY);

  return {
    onInteract(cb) { listeners.push(cb); },
    reveal(id) {
      const c = byId.get(id);
      if (!c || pan.scrollWidth <= pan.clientWidth) return;
      const [x] = projection(c.marker)!;
      const px = (x / W) * pan.scrollWidth;
      pan.scrollLeft = Math.max(0, px - pan.clientWidth * 0.35);
    },
  };
}
