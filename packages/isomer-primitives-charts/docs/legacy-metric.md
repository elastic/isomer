---
navigation_title: legacyMetric
description: Large values with a label above or below each, as Lens's legacy metric draws them.
---

# `legacyMetric`

Large values with a label above or below each, on the [chart core](core.md). Lens's legacy metric and the aggregation-based metric visualization (`expression_legacy_metric`) materialize into it. Each `metrics` column of each row is one tile; the tiles are centered in the chart and wrap onto more rows when they do not fit across it.

It is its own primitive, not a [`metric`](metric.md) variant. Kibana draws it without Elastic Charts, as plain text with no tile frame, sized by fixed type steps and shrunk to fit; it shows several columns at once, and has none of `metric`'s secondary value, progress bar, trend or icon. A host that shows a Lens legacy metric builds a `legacyMetric`; one that shows a Lens metric builds a `metric`.

| Field | What it is |
| --- | --- |
| `metrics` | One or more `{ column }`: the values, in tile order, every row of the first column then of the next |
| `breakdown` | `column`: one tile per row, its label led by the row's cell as displayed and " - ", as Kibana's split group labels it |
| `size` | `xs` to `xxl`, default `m`: the label at EUI's font size for the step (12, 14, 16, 20, 24 or 32 px) and the value at Lens's (24, 40, 50, 60, 80 or 96 px), as Lens's `toExpression` sets them |
| `labelPosition` | `top` (default, as Lens's) or `bottom` |
| `textAlign` | How the value and label align with each other within a tile: `left` (default, as Lens's), `center` or `right` |
| `showLabels` | Whether labels show. Default true |
| `applyColorTo` | What a `colors.bands` color paints: `background` (default) or the `value`'s text |
| `bandsRange` | `absolute` (default): band bounds are values. `percentage`: they are percentages of the range a column's values span, as Kibana's `getLegacyMetricDataBounds` gives it: its least to its greatest, or for a lone value from 0 to twice it (twice it to 0 when negative, and -50 to 100 for 0) |
| `interactions`, `emphasis` | Selectable `tile`s, a link and static highlights: [Interactions](interactions.md) |

With `colors.bands`, a tile of a `number` column is colored by the band its value falls in; a tile of any other column, or with no value, is not, as Lens colors only numbers. A lone tile's background color fills the whole chart, as Lens's `colorFullBackground` does; several tiles each fill their own box. On a colored background the value and label are white on a dark color and ink on a light one, by EUI's `isColorDark`, which is what Kibana's `needsLightText` intends. `colors.byKey` is not read. A chart with no rows says "No results found".

Rules:

- Every column reference names a column in `data.columns`.
- Each `metrics` column is named once, and the `breakdown` column is not one of them.
- Without a `breakdown`, `data` holds at most one row.
- Emphasis rows are indexes into `data.rows`.

## How it resolves

The Scene's `kind` is `legacyMetric`. Expected values come from Kibana's legacy metric (`MetricVisComponent`, `MetricVisValue` and `withAutoScale`) and Lens's `toExpression`:

- **Tiles**, metric by metric and row by row: each tile's value is its cell as displayed (its `display` string, else its format), and its label the column's label, after the breakdown cell and " - " with a `breakdown`.
- **Colors:** a band's color on the tile's background (or the chart's, for a lone tile), or on the value's text; else the chrome text color on the chrome background.
- **Type:** the value's and label's font sizes for `size`, 1.5 times as tall in line height, the value at weight 600, and 16 px of padding around them: Lens's `font` arguments and the container's `euiTheme.size.base`.
- **Fit:** with a `size`, each tile shrinks as `withAutoScale` shrinks it, by the smaller of the chart's width and height over the tile's, no further than three tenths and never grown, so its type sizes and padding in the Scene are the shrunk ones. A tile's box is estimated from Inter's character widths, rounded up so a tile shrinks rather than clips; the drawn text still truncates with an ellipsis where it meets the chart's edge.
- **Text:** each tile's description names its breakdown cell, if any, and its value; the summary sentence states one tile's label and value, lists every tile's, or says the columns have no data.
- **Selections:** each tile carries a `tile` selection when the node offers it: its row, and its breakdown column and cell, if any.

## Surfaces

No chart engine draws it: Kibana draws a legacy metric as plain DOM, so the pack's own legacy metric renderer does, the same in the browser and on Node, as the table renderer draws a `dataTable`. It draws the Scene as a wrapping, centered flex row of tiles with the pack's [Distillate](rendering.md#styling) classes, every per-tile color and length through CSS custom properties, and takumi rasterizes that markup on `snapshot`. The renderer is `sized`: without a host size the chart resolves for a 16:9 box at the chart width, taller when its tiles wrap to more rows than that holds, and `snapshotHeight` reports it. A selectable tile is a focusable button that raises its selection on click, Enter or Space. Text and Markdown write the summary, the description, each emphasis note and the data table. On Slack it is a picture asset, as the other charts are.

`legacyMetricExamples` covers one value, a lone value whose band fills the chart, values colored by percentage bands across a breakdown with the Other and missing buckets, several columns of one row, several columns by a breakdown with banded backgrounds, a string, a date and a missing number, a long value shrunk to fit with labels hidden, no rows, and selectable tiles with pre-rendered names, emphasis, a link and provenance.
