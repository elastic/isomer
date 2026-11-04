---
navigation_title: xyChart
description: Lines, areas and bars over a shared x axis, with reference lines and annotations.
---

# `xyChart`

Lines, areas and bars over a shared x axis, on the [chart core](core.md).

| Field | What it is |
| --- | --- |
| `orientation` | `vertical` (default) or `horizontal`, which puts x on the vertical axis |
| `layers` | Drawn in order. `data`, `referenceLines` and `annotations` layers |
| `axes` | `x`, `y` and `y2`: `title?`, `ticks?`, `grid?`, `labelOrientation?`, `scale?`, `domain?`, `rounding?` |
| `legend` | `visibility`, `position`, `inside` (a corner), `layout`, `columns`, `maxLines`, `size`, `statistics`, `seriesHeader` |
| `style` | `interpolation`, `fitting`, `points`, `areaOpacity`, `areaFill`, `barMinimumHeight`, `barValueLabels`, `partialBuckets` (the queried range), `currentTime` |

A `data` layer is `{ kind: 'data', mark: 'line' | 'area' | 'bar', stack?, x?, y: [{ column, axis?, color? }], splitBy?, rows? }`. When layers come from different source tables, the tables are appended to `data` in layer order and each layer names its `[start, end)` row range.

Reference lines sit at fixed values; annotations are points or ranges at fixed times. Neither carries rows, so neither is ever selected.

A series key, for `colors.byKey`, is the y column id without `splitBy`; with `splitBy` it is the split cell as a string (`null` as "null"), prefixed by the y column id and ":" when the layer has more than one y column.

Rules:

- Every column reference names a column in `data.columns`.
- A `y` column is a `number` column.
- A layer's `rows` is a `[start, end)` range within `data.rows`, with `start` at most `end`.
- Only `bar` and `area` layers stack.
- At least one layer is a `data` layer.
- An annotation range's `from` is not after its `to`.
