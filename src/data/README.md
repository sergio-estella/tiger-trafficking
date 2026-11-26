# Datos de la infografía «Tiger Trafficking»

Todos los diseños (versión revisada, pruebas de estilo y página responsive) se generaron con **los mismos datos**. Solo cambia el estilo visual, nunca los números.

Fuentes: TRAFFIC, *Skin and Bones* (ediciones 2022 y 2025). Tigres salvajes: Global Tiger Forum (2023).

## Archivos de origen (sin modificar)

| Archivo | Contenido |
|---|---|
| `data_by_year.csv` | Una fila por año, 2000–2025. Apariciones de cada parte en decomisos (Skins…Paws), total de apariciones, decomisos y tigres decomisados (dentro/fuera del área de distribución del tigre), % de decomisos fuera del área, personas encarceladas, censo de tigres salvajes (solo en años con censo) y evento. **2025 = enero–junio** y no trae los totales de decomisos ni de tigres. |
| `data_countries.csv` | Una fila por país. Decomisos y tigres 2000–jun 2025 y 2020–25, decomisos por año 2020–2025 (`s2025H1` = enero–junio), % de decomisos con animales enteros 2020–25 y tigres salvajes 2023. Las filas `(non-range)` son países fuera del área (Reino Unido, México, etc.). |
| `data_people_jailed_by_country.csv` | Personas encarceladas por país y año, 2000–2021, con una fila final de totales. |

## Archivos derivados (calculados a partir de los anteriores)

| Archivo | Qué contiene y cómo se calcula |
|---|---|
| `derived_by_year.csv` | Por año: `seizures_total` = dentro + fuera; `tigers_seized_total` = dentro + fuera; `tigers_per_seizure` = tigres ÷ decomisos; `pct_seizures_with_dead_tigers` = Dead_tigers ÷ decomisos totales × 100 (igual para vivos; «animales enteros» = suma de ambos); `pct_part_records_trophy` = (Skins + Bones) ÷ part_appearances_total × 100; `pct_part_records_amulet` = (Claws + Teeth) ÷ part_appearances_total × 100. |
| `derived_part_shares_by_year.csv` | % de cada parte sobre el total de apariciones de ese año (caras por año y líneas finas del gráfico de araña). |
| `derived_part_shares_by_period.csv` | El mismo % agregado por periodo: 2000–04, 2005–09, 2010–14, 2015–19 y 2020–25 (gráfico de araña). |
| `parts_head_legend.csv` | Cabeza Voronoi: `seizure_appearances_2000_jun2025` (tamaño de cada celda) y unidades decomisadas 2000–jun 2022 (leyenda de hexágonos). |
| `key_figures.csv` | Cifras de portada, cada una con su periodo y su fuente. |

## Cómo se calculó 2025 (enero–junio)

Para 2025 el CSV no trae decomisos ni tigres, así que se obtuvieron así:

- `seizures_total` 2025 = 2.551 − suma 2000–2024 = **33**
- `seizures_tiger_range` 2025 = suma de `s2025H1` en `data_countries.csv` = **30**, así que fuera del área = **3**
- `tigers_seized_total` 2025 = 3.808 − suma 2000–2024 = **33**. No hay reparto entre dentro y fuera del área.

## Discrepancias que hay que conocer

1. **Personas encarceladas: 387 frente a 375.** 387 es la cifra del brief (2000–jun 2022). 375 es el total del CSV por país (2000–2021). No se contradicen porque cubren periodos distintos; muestra siempre cada una con su periodo.
2. **Unidades decomisadas** (1.313 pieles, 11.528 huesos, 654 tigres muertos…) cubren **2000–jun 2022**, mientras que el resto de datos llega a **jun 2025**. Esas unidades vienen del brief de revisión, no de los CSV. Derivados y cráneos no tienen unidades.

Comprobación: la suma de `wild_tigers_2023` en los países del área da 5.574, que coincide con la cifra de portada.
