/**
 * Tiger range countries on the closing map (frame 93).
 *
 * Figures come from `tiger-map-countries.csv` (sources per row in the CSV):
 * - wild tigers: Global Tiger Forum, July 2023
 * - seizures and tigers seized: TRAFFIC, Skin and Bones 2025 (Jan 2000 – Jun 2025)
 * - people jailed: TRAFFIC, Skin and Bones 2022 (Jan 2000 – Jun 2022)
 *
 * The storyboard's "people jailed 2000–2021" column is NOT used: its source is
 * not a primary document. Edit the CSV, not this file, to change a figure.
 *
 * This file only adds what the CSV does not have: the Natural Earth id and the
 * marker / label placement on the map.
 */
import csv from './tiger-map-countries.csv?raw';

export type CountryStatus = 'wild' | 'extinct';

export interface Country {
  /** ISO 3166-1 numeric, as used by world-atlas (Natural Earth) */
  id: string;
  iso3: string;
  name: string;
  status: CountryStatus;
  /** Marker position [lon, lat] */
  marker: [number, number];
  labelSide: 'left' | 'right';
  wildTigers: number;
  /** '>' when the estimate is a lower bound (China) */
  wildTigersQualifier: string;
  seizures2000to2025: number | null;
  minTigersSeized2000to2025: number | null;
  seizures2020to2025: number | null;
  pctWhole2020to2025: number | null;
  peopleJailed2000to2022: number | null;
}

const LAYOUT: Record<string, { id: string; marker: [number, number]; labelSide: 'left' | 'right' }> = {
  RUS: { id: '643', marker: [134, 47], labelSide: 'right' },
  NPL: { id: '524', marker: [83.9, 28.4], labelSide: 'left' },
  BTN: { id: '064', marker: [90.4, 27.4], labelSide: 'right' },
  CHN: { id: '156', marker: [112, 32.5], labelSide: 'right' },
  IND: { id: '356', marker: [79, 22], labelSide: 'left' },
  BGD: { id: '050', marker: [89.8, 22.8], labelSide: 'left' },
  MMR: { id: '104', marker: [97.5, 21], labelSide: 'left' },
  LAO: { id: '418', marker: [102.5, 19.5], labelSide: 'left' },
  VNM: { id: '704', marker: [107.9, 14.6], labelSide: 'right' },
  THA: { id: '764', marker: [100.9, 15.4], labelSide: 'left' },
  KHM: { id: '116', marker: [104.9, 12.7], labelSide: 'right' },
  MYS: { id: '458', marker: [102.2, 4.2], labelSide: 'left' },
  IDN: { id: '360', marker: [101.5, -0.8], labelSide: 'right' },
};

/** Minimal CSV parser (no quoted fields in this file) */
function parse(text: string): Record<string, string>[] {
  const [head, ...rows] = text.trim().split(/\r?\n/);
  const keys = head.split(',');
  return rows.map((r) => {
    const cells = r.split(',');
    return Object.fromEntries(keys.map((k, i) => [k, (cells[i] ?? '').trim()]));
  });
}
const num = (v: string) => (v === '' ? null : Number(v));

export const countries: Country[] = parse(csv)
  .filter((r) => r.tiger_range_country === '1' && LAYOUT[r.iso3])
  .map((r) => {
    const wild = Number(r.wild_tigers_gtf_jul2023);
    return {
      ...LAYOUT[r.iso3],
      iso3: r.iso3,
      name: r.country,
      status: wild === 0 ? 'extinct' : 'wild',
      wildTigers: wild,
      wildTigersQualifier: r.wild_tigers_qualifier,
      seizures2000to2025: num(r.seizures_2000_to_jun2025),
      minTigersSeized2000to2025: num(r.min_tigers_seized_2000_to_jun2025),
      seizures2020to2025: num(r.seizures_2020_to_jun2025),
      pctWhole2020to2025: num(r.pct_seizures_whole_tigers_2020_to_jun2025),
      peopleJailed2000to2022: num(r.people_jailed_traffic_2000_to_jun2022),
    };
  });

/** Circle area ∝ wild tigers; India (3,682) keeps the storyboard's 58 px diameter */
export const markerDiameter = (wild: number) => 58 * Math.sqrt(wild / 3682);

export const DEFAULT_COUNTRY = '356'; // India, as in frame 93

export const byId = new Map(countries.map((c) => [c.id, c]));
