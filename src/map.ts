/**
 * Explorable map (frame 93 · HOLD · EXPLORE).
 *
 * Country shapes come from Natural Earth (world-atlas, public domain) instead
 * of the Figma export, where land and extinct countries are one bitmap and
 * cannot be made interactive. Land is plain black (no stripe decoration).
 *
 * Interaction never advances the story: selecting a country only updates the
 * card. On mobile the map pans horizontally only (JS drag, touch-action: pan-y),
 * so the vertical gesture always scrolls the page.
 */
import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
// Natural Earth 1:50m, clipped to the region and quantised (see scripts/build-map-data.mjs)
import mapData from './data/map-countries.json';
import { byId, countries, DEFAULT_COUNTRY, markerDiameter, type Country } from './data/countries';

const W = 1000;
const H = 900;
const SVG_NS = 'http://www.w3.org/2000/svg';
const fmt = new Intl.NumberFormat('en-GB');

export interface MapApi {
  /** Fired on any reader interaction (hint hides while the reader explores) */
  onInteract(cb: () => void): void;
  /** Mobile: pan so the middle of the map is in view */
  center(): void;
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
  const gOutside = el('g', { class: 'map__outside' });
  const gRange = el('g', { class: 'map__range' });
  const gMarkers = el('g', { class: 'map__markers', 'aria-hidden': 'true' });
  const gLabels = el('g', { class: 'map__labels', 'aria-hidden': 'true' });
  svg.append(gOutside, gRange, gMarkers, gLabels);

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
    } else {
      gOutside.append(el('path', { d, class: 'country country--outside' }));
    }
  }

  // Markers and labels
  for (const c of countries) {
    const [x, y] = projection(c.marker)!;
    const r = markerDiameter(c.wildTigers) / 2; // map is ~1000 px wide, as in the storyboard
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
  const n = (v: number | null) => (v == null ? '—' : fmt.format(v));

  function renderCard(c: Country) {
    const wild = c.status === 'extinct'
      ? 'No wild tigers left (2023)'
      : `${c.wildTigersQualifier === '>' ? 'More than ' : ''}${n(c.wildTigers)} wild tigers (2023)`;
    const seized = c.minTigersSeized2000to2025 == null ? '' : ` · at least ${n(c.minTigersSeized2000to2025)} tigers seized`;
    const whole = c.pctWhole2020to2025 == null ? '' : ` · ${c.pctWhole2020to2025}% with whole animals`;
    card.querySelector('.map-card__title')!.textContent = c.name.toUpperCase();
    card.querySelector('.map-card__body')!.innerHTML = `
      <p class="map-card__wild">${wild}</p>
      <hr />
      <p>${n(c.seizures2000to2025)} seizures${seized}</p>
      <p class="map-card__period">2000 – June 2025</p>
      <p>${n(c.seizures2020to2025)} seizures in 2020–25${whole}</p>
      <p class="map-card__jailed">${n(c.peopleJailed2000to2022)} people jailed, 2000 – June 2022</p>`;
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

  // --- Horizontal pan (mobile) -----------------------------------------------
  // touch-action: pan-y gives vertical swipes to the browser (page scroll) and
  // horizontal ones to us. Drag moves the map; no inertia, clamped to its edges.
  let offset = 0;
  const setOffset = (v: number) => {
    const max = Math.max(0, svg.getBoundingClientRect().width - pan.clientWidth);
    offset = Math.min(0, Math.max(-max, v));
    svg.style.transform = `translateX(${offset}px)`;
  };
  let drag: { id: number; x: number; start: number; moved: boolean } | null = null;
  pan.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    drag = { id: e.pointerId, x: e.clientX, start: offset, moved: false };
  });
  pan.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    if (!drag.moved) { drag.moved = true; interacted(); }
    setOffset(drag.start + dx);
  });
  let justDragged = false;
  const end = () => {
    justDragged = !!drag?.moved;
    drag = null;
    setTimeout(() => { justDragged = false; }, 0);
  };
  pan.addEventListener('pointerup', end);
  pan.addEventListener('pointercancel', end); // the browser took the gesture for vertical scroll
  // A drag must not also select the country under the finger
  pan.addEventListener('click', (e) => { if (justDragged) e.stopPropagation(); }, true);
  window.addEventListener('resize', () => setOffset(offset));

  select(DEFAULT_COUNTRY);

  return {
    onInteract(cb) { listeners.push(cb); },
    center() {
      const width = svg.getBoundingClientRect().width;
      if (width > pan.clientWidth) setOffset(-(width - pan.clientWidth) / 2);
    },
    reveal(id) {
      const c = byId.get(id);
      const width = svg.getBoundingClientRect().width;
      if (!c || width <= pan.clientWidth) return;
      const [x] = projection(c.marker)!;
      setOffset(-((x / W) * width - pan.clientWidth * 0.35));
    },
  };
}
