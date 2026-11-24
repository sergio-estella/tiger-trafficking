import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/700.css';
import '@fontsource/roboto-slab/700.css';
import '@fontsource/anton/400.css';
import './styles.css';

import { createMap } from './map';
import { createClosing } from './closing';

const closingSection = document.querySelector<HTMLElement>('#closing')!;
const map = createMap(closingSection.querySelector<HTMLElement>('.map')!);
const closing = createClosing(closingSection);
map.onInteract(() => closing.notifyInteraction());

// Mobile: start the horizontal pan with India in view, as in 93-map_1
requestAnimationFrame(() => map.reveal('356'));
