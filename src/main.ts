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

// Mobile: start with the map centred, so countries on both sides stay in view
requestAnimationFrame(() => map.center());

// Menu (frame MENU): opens over everything; chapter links close it and jump
const menu = document.querySelector<HTMLElement>('#menu')!;
const menuBtn = document.querySelector<HTMLButtonElement>('.menu-btn')!;
const openMenu = () => { menu.hidden = false; menu.querySelector<HTMLElement>('a')?.focus(); document.body.style.overflow = 'hidden'; };
const closeMenu = () => { menu.hidden = true; document.body.style.overflow = ''; menuBtn.focus(); };
menuBtn.addEventListener('click', openMenu);
menu.querySelector('.menu-close')!.addEventListener('click', closeMenu);
menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
menu.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', closeMenu));
