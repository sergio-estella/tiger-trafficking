/**
 * Story skeleton, in storyboard order ("Tiger trafficking — Storyboard 2").
 *
 * Openers follow the frame-92 pattern (title, text, chapter number bottom-left);
 * `enter` / `exit` say where each element comes from and goes to, as drawn in the
 * storyboard frames. Charts are placeholders until each one is built.
 */

export type From = 'right' | 'left' | 'below' | 'above' | 'none';

export interface Opener {
  kind: 'opener';
  id: string;            // menu anchor (#ch01…)
  number: string;        // "01."
  frames: string;
  theme: 'pale' | 'red';
  title: string;
  subtitle?: string;     // e.g. "Wild tigers a century ago" (chapter 01)
  body: string;          // HTML: <strong> for bold runs
  body2?: string;        // second paragraph that scrolls in (chapter 01)
  enter: { title: From; body: From };
  exit: { title: From; body: From };
  /** Starts on black and turns pale (chapter 05, frames 79–81) */
  fromBlack?: boolean;
}

export interface Placeholder {
  kind: 'placeholder';
  id?: string;
  number: string;
  frames: string;
  title: string;
  note: string;
}

/** A built chart scene (see src/scenes/) */
export interface Built { kind: 'faces'; frames: string }

export type Section = Opener | Placeholder | Built;

export const story: Section[] = [
  // 01 (frames 9–15) is part of the intro scene in src/story.ts: the zoom flows straight into it
  {
    kind: 'opener', id: 'ch02', number: '02.', frames: '16–21', theme: 'pale',
    title: 'Sold in pieces',
    body: 'Some tigers are found alive.<br />Others are found dead.<br />In many seizures,<br />what authorities find is a skin, bones, claws or teeth.',
    enter: { title: 'right', body: 'below' }, exit: { title: 'left', body: 'above' },
  },
  { kind: 'faces', frames: '22–28' },
  {
    kind: 'opener', id: 'ch03', number: '03.', frames: '29–34', theme: 'pale',
    title: 'How many tigers?',
    body: 'In 2016, authorities recorded <strong>135 seizures involving 320 tigers</strong>. A year later, they recorded <strong>120 seizures involving 126 tigers</strong>.',
    enter: { title: 'left', body: 'right' }, exit: { title: 'right', body: 'left' },
  },
  { kind: 'placeholder', number: '03.', frames: '35–41', title: 'Seizures, 2000–2025 (radial)', note: 'Every seizure in tiger range countries' },
  { kind: 'placeholder', number: '03.', frames: '42–49', title: 'Year by year: seizures rose, tigers seized peaked in 2016', note: 'Bars per year' },
  {
    kind: 'opener', id: 'ch04', number: '04.', frames: '50–56', theme: 'pale',
    title: 'What is trafficked',
    body: 'Skins and bones tell one part of the story. Claws and teeth tell another. The mix of parts found in seizures changes from year to year.',
    enter: { title: 'right', body: 'below' }, exit: { title: 'left', body: 'above' },
  },
  { kind: 'placeholder', number: '04.', frames: '57–62', title: 'What was seized', note: 'Tiger parts, icons' },
  { kind: 'placeholder', number: '04.', frames: '63–67', title: 'What is trafficked (shares per period)', note: 'Radar shapes, 2000–04 … 2020–25' },
  { kind: 'placeholder', number: '04.', frames: '68–78', title: 'People jailed for tiger trafficking · man behind bars', note: 'Chart and illustration before the chapter 05 opener' },
  {
    kind: 'opener', id: 'ch05', number: '05.', frames: '79–83', theme: 'pale', fromBlack: true,
    title: 'People jailed',
    body: 'How many people were jailed for tiger trafficking, and where? The available records show how those numbers vary by year and country.',
    enter: { title: 'none', body: 'none' }, exit: { title: 'right', body: 'above' },
  },
  {
    kind: 'opener', id: 'ch06', number: '06.', frames: '84–85', theme: 'pale',
    title: 'Seizures recorded',
    body: 'Between January 2020 and June 2025, authorities recorded seizures both within and beyond tiger-range countries.',
    enter: { title: 'none', body: 'none' }, exit: { title: 'above', body: 'above' },
  },
  { kind: 'placeholder', number: '06.', frames: '86–91', title: 'Seizures by country, 2020–2025 (hexagons)', note: 'Ends dripping into red (chapter 07)' },
];
