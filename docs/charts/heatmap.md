---
navigation_title: heatmap
description: A grid of cells by two dimensions, colored by value bands, as Lens's heat map draws it.
---

# `heatmap`

Cells by an `x` and a `y` dimension, colored by value, on the [chart core](core.md). Lens's heat map materializes into it. Each distinct `x` cell is a column of cells, each distinct `y` cell a row, and each row of `data` a cell colored by the `colors.bands` band its `value` falls in.

| Field                      | What it is                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x`                        | `column`; `sort` (`asc` or `desc`: numbers by value, anything else alphabetically by its text; absent keeps the order rows first show them); `interval`, the bucket width in milliseconds of a `date` column. A `date` column with two or more instants, or with an `interval`, is a time axis in time order, whatever `sort` says |
| `y`                        | `column` and `sort`, as `x`'s, top first. Absent means one row of cells, with no labels                                                                                                                                                                                                                                            |
| `value`                    | `column`: the `number` column whose values color the cells                                                                                                                                                                                                                                                                         |
| `bandsRange`               | `absolute` (default): `colors.bands` bounds are values. `percentage`: they are percentages from the smallest value (0) to the largest (100); where every value is the same, each takes the last band                                                                                                                               |
| `cellLabels`               | Write each cell's value in it, where it fits. Default false                                                                                                                                                                                                                                                                        |
| `axes`                     | `x` and `y`: `title` (absent means none) and `labels` (default true); `x.labelOrientation` (`horizontal`, `vertical` or `angled`); `x.domain`, the instants a time axis spans: `fit` (default) or `custom` `min` and `max` in epoch milliseconds, as an `xyChart`'s, such as Lens's time range                                     |
| `gridLines`                | `width` in pixels between cells (default 1) and `color` (default the grid-line chrome color)                                                                                                                                                                                                                                       |
| `legend`                   | `visibility` (`visible`, the default, or `hidden`), `position` (default `right`), `maxLines` (default 1), `size`                                                                                                                                                                                                                   |
| `interactions`, `emphasis` | Selectable `cell`s, a `brush` along a time axis, a link and static highlights: [Interactions](interactions.md)                                                                                                                                                                                                                     |

With no `colors.bands`, values take five temperature colors (EUI's `euiPaletteForTemperature(5)`) in equal steps from the smallest value to the largest, the last open above, as Lens's default palette does. A cell whose value is missing or not a number is left empty, and a row whose `x` or `y` cell is missing is not drawn, nor its position, as Elastic Charts leaves it out of Lens's heat map; a value in no band is drawn transparent. `colors.byKey` does not apply. A chart with no value to draw says "No results found".

Rules:

- Every column reference names a column in `data.columns`.
- The `value` column is a `number` column.
- The `x`, `y` and `value` columns are not `multivalue`.
- The `x`, `y` and `value` columns are three different columns.
- No two rows hold the same `x` cell and the same `y` cell.
- Only a `date` `x` column has an `x.interval`.
- Only a `date` `x` column has an `axes.x.domain`, and a `custom` one has `min` below `max`.
- A `brush` column is the `x` column, and a `date` column.
- A `bandsRange` needs `colors.bands`.
- Emphasis rows are indexes into `data.rows`.

## How it resolves

The Scene's `kind` is `heatmap`. Expected values come from Lens's heat map (`expression_heatmap`):

- **Positions:** each axis lists every distinct cell of the drawn rows, a date by its instant, in the order rows first show them, or by `sort`. A time axis is in time order, each position `interval` wide: the node's, else the smallest spacing between instants, as Lens infers one. Its `timeZone` is the zone whose round times every position falls on, `interval` apart, as a date histogram in that zone buckets: the x column format's, else the chart's, else UTC. With none, the axis is ordinal, so no cell falls off the grid. A `custom` `axes.x.domain` is the axis's `domain`, which the engine draws empty columns across. On a time axis a position is its instant; on any other axis it is an opaque key, and its label is its cell as displayed (its `display` string, else its format). With no `y`, the y axis has one position with an empty label and shows no labels.
- **Bands** ascend from `colors.bands`, or the default palette: each with its `start` (inclusive) and `end` (exclusive) as values, so a percentage bound is placed in the value range and the last band's inclusive top becomes the least number above it. A band with nothing between its bounds is dropped. Each band's label is its range in the value column's format, as Lens's legend writes it: "_from_ - _to_", "≥ _from_" or "< _to_".
- **Cells:** one per position pair with a value, in row order, colored by the band its value falls in, else transparent (`#FFFFFF00`). Rows that share a pair, date-times for one instant, are one cell from the first row with a value. A cell's `valueText` is its `display` string, else its value in the column's format.
- **Text:** each cell's description and tooltip name its x and y positions and its value. The summary sentence names the value, the axes, and the smallest and largest values.
- **Selections:** each cell carries a `cell` selection when the node offers it: its rows, its `x` and `y` columns, and their cells. A brush along a time axis raises `chart.brush` along the `x` column, its ends named by the nearest positions.

## Surfaces

The [Elastic Charts engines](../charts-elastic/index.md) draw it, in the browser and headless. Without a host size it takes a 16:9 box, as an `xyChart` that fills its container does, and `snapshotHeight` reports it. Text and Markdown write the summary, the description, each emphasis note and the data table. On Slack it is a picture asset, as the other charts are.

`heatmapExamples` covers an hourly time axis with the default palette, stated bands over categories with the Other bucket, rows with a missing position, and cell labels, percentage bands with sorted axes, one row with no `y`, huge, tiny, missing and out-of-band values, every value the same, no rows, and selectable, brushable cells with pre-rendered values, emphasis, a link and provenance.
