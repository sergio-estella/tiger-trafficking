/**
 * Data layer shared by the story and the dashboard.
 *
 * Sources (see docs/data-sources.md): TRAFFIC, Skin and Bones (2022, 2025);
 * Global Tiger Forum (2023). The CSVs in this folder are the single source:
 * edit them, not the charts.
 */
import byYearCsv from './data_by_year.csv?raw';
import derivedCsv from './derived_by_year.csv?raw';

/** CSV parser with quoted fields ("Global Tiger Summit, St. Petersburg") */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((k, i) => [k.trim(), (r[i] ?? '').trim()])));
}
const num = (v: string) => (v === '' ? null : Number(v));

// ------------------------------------------------------------------ tiger parts
export type PartKey =
  | 'Skins' | 'Bones' | 'Dead_tigers' | 'Live_tigers' | 'Claws' | 'Teeth'
  | 'Other_parts' | 'Derivatives' | 'Skulls' | 'Meat' | 'Paws';

export interface Part {
  key: PartKey;
  label: string;
  color: string;
  /** Units seized, Jan 2000 – Jun 2022 (TRAFFIC 2022), as printed in the storyboard; null = not reported */
  units: string | null;
  /** Where the label goes and where the cell starts inside the head (0–1 of the head box) */
  side: 'left' | 'right';
  seed: [number, number];
}

// Colours from the storyboard (frame 25); live tigers are hatched
export const PARTS: Part[] = [
  { key: 'Live_tigers', label: 'Live tigers', color: '#9c9c9c', units: '665 live tigers', side: 'left', seed: [0.22, 0.2] },
  { key: 'Other_parts', label: 'Other parts', color: '#9c8a72', units: '503 whiskers (other parts)', side: 'left', seed: [0.48, 0.24] },
  { key: 'Skins', label: 'Skins', color: '#e2560c', units: '1,313 skins + 609 pieces', side: 'left', seed: [0.3, 0.5] },
  { key: 'Claws', label: 'Claws', color: '#741505', units: '3,101 claws', side: 'left', seed: [0.22, 0.74] },
  { key: 'Derivatives', label: 'Derivatives', color: '#6b3214', units: null, side: 'left', seed: [0.44, 0.8] },
  { key: 'Paws', label: 'Paws', color: '#f7c6a4', units: '129 paws', side: 'left', seed: [0.5, 0.93] },
  { key: 'Dead_tigers', label: 'Dead tigers', color: '#111111', units: '654 dead tigers', side: 'right', seed: [0.76, 0.2] },
  { key: 'Bones', label: 'Bones', color: '#fff8e6', units: '11,528 bones + 2.9 t', side: 'right', seed: [0.7, 0.45] },
  { key: 'Skulls', label: 'Skulls', color: '#f49a2e', units: null, side: 'right', seed: [0.55, 0.62] },
  { key: 'Teeth', label: 'Teeth', color: '#d3311a', units: '953 teeth', side: 'right', seed: [0.74, 0.68] },
  { key: 'Meat', label: 'Meat', color: '#b4451a', units: '1.1 t of meat', side: 'right', seed: [0.62, 0.84] },
];
export const partByKey = new Map(PARTS.map((p) => [p.key, p]));

// ------------------------------------------------------------------ by year
export interface YearRow {
  year: number;
  partial: boolean;            // 2025 = January–June
  seizures: number;            // all seizures (tiger range + outside)
  parts: Record<PartKey, number>; // seizures containing each part
  partTotal: number;           // part appearances
  event: string;
  seizuresRange: number | null;
  seizuresOutside: number | null;
  pctOutside: number | null;
  tigersTotal: number | null;
  tigersRange: number | null;    // 2025: split not available
  tigersOutside: number | null;
  pctDead: number | null;        // % of seizures with dead tigers
  pctLive: number | null;        // % of seizures with live tigers
  pctTrophy: number | null;      // skins + bones, % of part records
  pctAmulet: number | null;      // claws + teeth, % of part records
  jailed: number | null;         // people jailed, tiger range countries (2000–2021)
  wildCensus: number | null;     // wild tigers, census years only
}

const derived = new Map(parseCsv(derivedCsv).map((r) => [Number(r.year), r]));

export const years: YearRow[] = parseCsv(byYearCsv).map((r) => {
  const year = Number(r.year);
  const d = derived.get(year)!;
  const parts = Object.fromEntries(PARTS.map((p) => [p.key, Number(r[p.key] || 0)])) as Record<PartKey, number>;
  return {
    year,
    partial: d?.is_partial_year === '1',
    seizures: num(d?.seizures_total ?? '') ?? 0,
    parts,
    partTotal: Number(r.part_appearances_total),
    event: r.event,
    seizuresRange: num(d?.seizures_tiger_range ?? ''),
    seizuresOutside: num(d?.seizures_outside_range ?? ''),
    pctOutside: num(d?.pct_seizures_outside ?? ''),
    tigersTotal: num(d?.tigers_seized_total ?? ''),
    tigersRange: num(d?.tigers_seized_tiger_range ?? ''),
    tigersOutside: num(d?.tigers_seized_outside_range ?? ''),
    pctDead: num(d?.pct_seizures_with_dead_tigers ?? ''),
    pctLive: num(d?.pct_seizures_with_live_tigers ?? ''),
    pctTrophy: num(d?.pct_part_records_trophy_skins_bones ?? ''),
    pctAmulet: num(d?.pct_part_records_amulet_claws_teeth ?? ''),
    jailed: num(d?.people_jailed_tiger_range ?? ''),
    wildCensus: num(r.wild_tigers_census),
  };
});

/** Seizures containing each part, Jan 2000 – Jun 2025 */
export const partTotals = Object.fromEntries(
  PARTS.map((p) => [p.key, years.reduce((s, y) => s + y.parts[p.key], 0)]),
) as Record<PartKey, number>;

export const pct = (v: number, total: number) => (total ? Math.round((v / total) * 100) : 0);

/** Story colours for the yearly charts (storyboard frames 39 and 42) */
export const YEAR_COLORS = {
  seizures: '#e2560c',
  tigers: '#9e220a',
  outside: '#ffffff',
  dead: '#111111',
  live: '#9c9c9c',     // hatched where space allows
  trophy: '#e2560c',
  amulet: '#741505',
  jailed: '#0b5a50',
  wild: '#24520f',
  event: '#ffdd03',
  eventText: '#8a1c06',
};

/** Events marked across the yearly charts */
export const EVENTS: Record<number, string> = Object.fromEntries(
  years.filter((y) => y.event).map((y) => [y.year, y.event]),
);
