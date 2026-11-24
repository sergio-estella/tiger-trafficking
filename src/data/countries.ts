/**
 * Tiger range countries shown on the closing map (frame 93).
 *
 * ⚠️ ALL FIGURES ARE PENDING VERIFICATION against the original sources
 * (Global Tiger Forum 2023, TRAFFIC 2000 – June 2025, people-jailed dataset).
 * They are copied from the Figma storyboard ("Tiger trafficking — Storyboard 2")
 * and must not be published until checked. `null` = not in the storyboard yet.
 *
 * markerSize is NOT data: it is the diameter (px at 1440×900) of the green
 * circle drawn in Figma, used only as a placeholder until the real 2023
 * wild-tiger counts are confirmed and the circle area can be computed from them.
 */

export type CountryStatus = 'wild' | 'extinct';

export interface Country {
  /** ISO 3166-1 numeric, as used by world-atlas (Natural Earth) */
  id: string;
  name: string;
  status: CountryStatus;
  /** Marker position [lon, lat] */
  marker: [number, number];
  /** Label offset in px relative to the marker (desktop) */
  labelSide: 'left' | 'right';
  markerSize: number;
  wildTigers2023: number | null;
  seizures2000to2025: number | null;
  tigersSeized2000to2025: number | null;
  seizures2020to2025: number | null;
  pctWhole2020to2025: number | null;
  peopleJailed2000to2021: number | null;
}

export const VERIFIED = false;

export const countries: Country[] = [
  { id: '643', name: 'Russia', status: 'wild', marker: [134, 47], labelSide: 'right', markerSize: 21, wildTigers2023: null, seizures2000to2025: null, tigersSeized2000to2025: null, seizures2020to2025: 28, pctWhole2020to2025: 55, peopleJailed2000to2021: null },
  { id: '524', name: 'Nepal', status: 'wild', marker: [83.9, 28.4], labelSide: 'left', markerSize: 18, wildTigers2023: null, seizures2000to2025: null, tigersSeized2000to2025: null, seizures2020to2025: 13, pctWhole2020to2025: 15, peopleJailed2000to2021: null },
  { id: '064', name: 'Bhutan', status: 'wild', marker: [90.4, 27.4], labelSide: 'right', markerSize: 11, wildTigers2023: null, seizures2000to2025: null, tigersSeized2000to2025: null, seizures2020to2025: 0, pctWhole2020to2025: null, peopleJailed2000to2021: null },
  { id: '156', name: 'China', status: 'wild', marker: [112, 32.5], labelSide: 'right', markerSize: 9, wildTigers2023: null, seizures2000to2025: null, tigersSeized2000to2025: null, seizures2020to2025: 28, pctWhole2020to2025: 4, peopleJailed2000to2021: null },
  { id: '356', name: 'India', status: 'wild', marker: [79, 22], labelSide: 'left', markerSize: 58, wildTigers2023: 3682, seizures2000to2025: 880, tigersSeized2000to2025: 981, seizures2020to2025: 230, pctWhole2020to2025: 20, peopleJailed2000to2021: 88 },
  { id: '050', name: 'Bangladesh', status: 'wild', marker: [89.8, 22.8], labelSide: 'left', markerSize: 10, wildTigers2023: null, seizures2000to2025: null, tigersSeized2000to2025: null, seizures2020to2025: 7, pctWhole2020to2025: 0, peopleJailed2000to2021: null },
  { id: '104', name: 'Myanmar', status: 'wild', marker: [97.5, 21], labelSide: 'left', markerSize: 9, wildTigers2023: null, seizures2000to2025: null, tigersSeized2000to2025: null, seizures2020to2025: 0, pctWhole2020to2025: null, peopleJailed2000to2021: null },
  { id: '418', name: 'Laos', status: 'extinct', marker: [102.5, 19.5], labelSide: 'left', markerSize: 22, wildTigers2023: 0, seizures2000to2025: null, tigersSeized2000to2025: null, seizures2020to2025: 3, pctWhole2020to2025: 33, peopleJailed2000to2021: null },
  { id: '704', name: 'Viet Nam', status: 'extinct', marker: [107.9, 14.6], labelSide: 'right', markerSize: 22, wildTigers2023: 0, seizures2000to2025: null, tigersSeized2000to2025: null, seizures2020to2025: 55, pctWhole2020to2025: 57, peopleJailed2000to2021: null },
  { id: '764', name: 'Thailand', status: 'wild', marker: [100.9, 15.4], labelSide: 'left', markerSize: 12, wildTigers2023: null, seizures2000to2025: null, tigersSeized2000to2025: null, seizures2020to2025: 20, pctWhole2020to2025: 43, peopleJailed2000to2021: null },
  { id: '116', name: 'Cambodia', status: 'extinct', marker: [104.9, 12.7], labelSide: 'right', markerSize: 22, wildTigers2023: 0, seizures2000to2025: null, tigersSeized2000to2025: null, seizures2020to2025: 2, pctWhole2020to2025: 0, peopleJailed2000to2021: null },
  { id: '458', name: 'Malaysia', status: 'wild', marker: [102.2, 4.2], labelSide: 'left', markerSize: 12, wildTigers2023: null, seizures2000to2025: null, tigersSeized2000to2025: null, seizures2020to2025: 18, pctWhole2020to2025: 21, peopleJailed2000to2021: null },
  { id: '360', name: 'Indonesia', status: 'wild', marker: [101.5, -0.8], labelSide: 'right', markerSize: 19, wildTigers2023: null, seizures2000to2025: null, tigersSeized2000to2025: null, seizures2020to2025: 77, pctWhole2020to2025: 41, peopleJailed2000to2021: null },
];

export const DEFAULT_COUNTRY = '356'; // India, as in frames 93–94

export const byId = new Map(countries.map((c) => [c.id, c]));
