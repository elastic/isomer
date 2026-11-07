---
navigation_title: xyChart
description: Lines, areas and bars over a shared x axis, with reference lines and annotations.
---

# `xyChart`

Lines, areas and bars over a shared x axis, on the [chart core](core.md).

| Field                      | What it is                                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orientation`              | `vertical` (default) or `horizontal`, which puts x on the vertical axis                                                                                                          |
| `layers`                   | Drawn in order. `data`, `referenceLines` and `annotations` layers                                                                                                                |
| `axes`                     | `x`, `y` and `y2`: `title?`, `ticks?`, `grid?`, `labelOrientation?`, `scale?`, `domain?`, `rounding?`; `x` also `interval?`, the bucket width                                    |
| `legend`                   | `visibility`, `position`, `inside` (a corner), `layout`, `columns`, `maxLines`, `size`, `statistics`, `seriesHeader`                                                             |
| `interactions`, `emphasis` | Selection, brushing, sync, a link, series hidden at first, and static highlights: [Interactions](interactions.md)                                                                |
| `style`                    | `interpolation`, `fitting`, `points`, `areaOpacity` (0 to 1, default 0.3), `areaFill`, `barMinimumHeight`, `barValueLabels`, `partialBuckets` (the queried range), `currentTime` |

A `data` layer is `{ kind: 'data', mark: 'line' | 'area' | 'bar', stack?, x?, y: [{ column, axis?, color? }], splitBy?, rows? }`. Every data layer uses the same `x` column; when it is absent, every row draws at one x position. When layers come from different source tables, the tables are appended to `data` in layer order, each layer names its `[start, end)` row range, and each table's x field maps to the one x column, in one date encoding when it is a `date` column.

`axes.x.interval` is the bucket width in x units, milliseconds on a time axis, which a materializer reads from the aggregation that built the x column, as Kibana's `calculateMinInterval` does. A bucket draws as partial when it crosses an edge of `style.partialBuckets`, and an engine sizes bars by the interval, as Elastic Charts' `minInterval` does. Without it, the resolver takes the smallest spacing between x values for partial buckets, and the engine infers its own. It is a fixed width, so calendar months and years, and days across a daylight-saving change, are approximate, as `minInterval` is. It is ignored on an ordinal axis.

Reference lines sit at fixed values; annotations are points or ranges at fixed times. Both can carry a [glyph](core.md#glyphs) `icon`. Neither carries rows, so neither is ever selected.

A series key, for `colors.byKey` and `interactions.initial.hiddenSeries`, is the y column id without `splitBy`; with `splitBy` it is the split cell, which for a `date` column is the first row's cell among those showing one instant, prefixed by the y column id and ":" when the layer has more than one y column or more than one data layer has `splitBy`. Series that share a key, such as two layers plotting one y column, share its `colors.byKey` entry and hidden state. The y column id and the split cell are each a key part: the value as a string with each `\` and `:` preceded by `\`; a missing (null) cell is the key part `\null`, which no string produces.

Rules:

- Every column reference names a column in `data.columns`.
- On a continuous x scale, stated or inferred from the x column type, each non-missing x cell is a finite number for `linear`, or epoch milliseconds or an ISO 8601 date-time with a UTC offset for `temporal`.
- The `x`, `y` and `splitBy` columns are not `multivalue`.
- A `date` column holds one encoding: every non-missing value is epoch milliseconds, or every one is an ISO 8601 date-time.
- A `y` column is a `number` column.
- A layer's `rows` is a `[start, end)` range within `data.rows`, with `start` at most `end`.
- Only `bar` and `area` layers stack.
- At least one layer is a `data` layer.
- Every data layer uses the same x column; absent means every row draws at one x position.
- An annotation range's `from` is not after its `to`.
- A `custom` axis domain has `min` below `max`, and on a `log` y axis `min` above zero.
- A `brush` column is a `date` or `number` column used as `x` by at least one `data` layer.
- Emphasis rows are indexes into `data.rows`.
