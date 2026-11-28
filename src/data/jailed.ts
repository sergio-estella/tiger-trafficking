/** People jailed for tiger trafficking, per year and country, 2000–2021 (TRAFFIC 2022) */
import { parseCsv } from './series';
import jailedCsv from './data_people_jailed_by_country.csv?raw';

export const COUNTRIES = [
  { key: 'India', label: 'India', color: '#e2560c' },
  { key: 'China', label: 'China', color: '#ffffff' },
  { key: 'Indonesia', label: 'Indonesia', color: '#6b3214' },
  { key: 'Viet Nam', label: 'Viet Nam', color: '#9e220a' },
  { key: 'Nepal', label: 'Nepal', color: '#6e5a96' },
  { key: 'Other tiger range countries', label: 'Other countries', color: '#8c8070' },
];
export const jailedRows = parseCsv(jailedCsv).filter((r) => /^\d{4}$/.test(r.year)).map((r) => ({
  year: Number(r.year), total: Number(r.Total || 0),
  by: COUNTRIES.map((c) => Number(r[c.key] || 0)),
}));
export const jailedTotals = COUNTRIES.map((_, i) => jailedRows.reduce((s, r) => s + r.by[i], 0));
export const jailedGrand = jailedRows.reduce((s, r) => s + r.total, 0);
// the two peaks the storyboard points at, worked out from the data
export const peakNote = (year: number) => {
  const r = jailedRows.find((x) => x.year === year)!;
  const i = r.by.indexOf(Math.max(...r.by));
  return `${year}: ${r.by[i]} of ${r.total} in ${COUNTRIES[i].label}`;
};

