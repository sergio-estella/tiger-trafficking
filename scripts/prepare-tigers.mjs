// Prepares the layered tiger SVGs from assets-src/ for inlining in the page:
// - removes the XML declaration and Inkscape-only attributes
// - prefixes every id (and url(#id) reference) so the two SVGs can live in one document
// - tags each animatable layer group with data-part="<name>"
// Run: node scripts/prepare-tigers.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const LAYERS = ['body', 'head', 'jaw', 'front-leg-left', 'front-leg-right', 'hind-leg-left', 'hind-leg-right', 'tail-1', 'tail-2', 'tail-3', 'pivot-guides'];

for (const [src, prefix] of [['tigre-frontal-capas', 'tf'], ['tigre-perfil-capas', 'tp']]) {
  let svg = readFileSync(`assets-src/tigers/${src}.svg`, 'utf8');
  svg = svg.replace(/<\?xml[^>]*\?>\s*/, '');
  svg = svg.replace(/\s+xmlns:inkscape="[^"]*"/, '').replace(/\s+inkscape:[a-z]+="[^"]*"/g, '');
  svg = svg.replace(/<g id="([^"]+)"/g, (m, id) => (LAYERS.includes(id) ? `<g data-part="${id}" id="${prefix}-${id}"` : `<g id="${prefix}-${id}"`));
  svg = svg.replace(/ id="(?!t[fp]-)([^"]+)"/g, ` id="${prefix}-$1"`);
  svg = svg.replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`);
  // GSAP sets the rotation origin from data-pivot (svgOrigin); a CSS transform-origin would fight it
  svg = svg.replace(/ style="transform-origin:[^"]*"/g, '');
  svg = svg.replace(/<svg /, `<svg class="tiger-svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" `);
  svg = svg.replace(/ width="\d+" height="\d+"/, '');
  writeFileSync(`src/assets/tigers/${src}.svg`, svg);
  console.log(src, svg.length, 'parts:', (svg.match(/data-part=/g) || []).length);
}
