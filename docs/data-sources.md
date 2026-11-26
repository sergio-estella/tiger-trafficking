# Data sources (for «About the data»)

| Data | Source |
|---|---|
| **Wild tigers by country** | Global Tiger Forum, estimates published July 2023, p. 2. China's `>` qualifier is kept in its own column so the card can show «More than 60». [Press release (PDF)](https://globaltigerforum.org/wp-content/uploads/2023/07/Press-release_Global-Tiger-Day2023_GTF.pdf#page=2) |
| **Seizures, tigers seized and whole animals** | TRAFFIC, *Beyond Skin and Bones* (2025). Figure 1 for totals outside the tiger range, figure 4 for tiger range country totals and figure 10 for the share of seizures with whole animals. [Report (PDF)](https://www.traffic.org/site/assets/files/29537/full_report_skin_and_bones_2025_v5_highres-1.pdf) |
| **People jailed** | TRAFFIC, *Skin and Bones* (2022), figure 23, January 2000 – June 2022. The storyboard's 2000–2021 figures differ slightly (e.g. India: 87 in the published source, 88 in the storyboard card); the site uses the published source. [Report (PDF)](https://www.traffic.org/site/assets/files/19714/skin_and_bones_tiger_trafficking_analysis_from_january_2000_to_june_2022_r7.pdf#page=42) |

Data file: `src/data/tiger-map-countries.csv`.

## Story and dashboard data (shared)

How the files were built, how 2025 (January–June) was derived and the known discrepancies
(people jailed 387 vs 375; units seized cover 2000 – June 2022): `src/data/README.md` (Spanish).

| File | What | Source |
|---|---|---|
| `src/data/data_by_year.csv` | Per year, 2000 – June 2025: seizures containing each tiger part, part appearances, seizures and tigers seized (in / outside the tiger range), people jailed, wild tiger census, events | TRAFFIC, *Skin and Bones* (2022, 2025); Global Tiger Forum (2023) |
| `src/data/derived_by_year.csv` | Totals and shares derived from the above (2025 = January–June; see `derivation_note`) | Derived |
| `src/data/derived_part_shares_by_period.csv` | Share of each part among all part appearances, by five-year period | Derived |
| `src/data/data_countries.csv` | Per country: seizures and tigers seized 2000 – June 2025 and 2020–25 by year, % whole animals, wild tigers 2023 | TRAFFIC 2025; Global Tiger Forum 2023 |
| `src/data/data_people_jailed_by_country.csv` | People jailed per year and country, 2000–2021 | TRAFFIC 2022 |

"One face per year": cell area = seizures that contained each part (sums of `data_by_year.csv`,
they match the storyboard exactly). Units seized per part (e.g. "1,313 skins + 609 pieces",
January 2000 – June 2022) are not in the CSVs; they are taken from the storyboard and listed in
`src/data/series.ts` (`PARTS`).
