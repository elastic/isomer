---
navigation_title: metric
description: One headline value, or one tile per row, with an optional secondary value, progress bar or trend line.
---

# `metric`

One headline value, or one tile per row of `data`, on the [chart core](core.md).

| Field | What it is |
| --- | --- |
| `value` | `column`, `subtitle?`, `color?` (a `ColorValue`, or `bands` to color by `colors.bands`), `bandsRange?` (`absolute` or `percentage` of the maximum), `applyColorTo?` (`value` or `background`) |
| `secondary` | `column`, `showLabel?`, `labelPlacement?` (`before`, `after`, `tooltip`), `color?`, `compare?` |
| `secondary.compare` | `to` (`baseline` or `primary`), `baseline?`, `showIcon?`, `showValue?`, and `colors: { increase, decrease, neutral }` |
| `background` | `{ kind: 'bar', max, orientation? }`, a progress bar to the `max` column; or `{ kind: 'trend', data, x, y, breakdown? }`, a trend line from its own table |
| `breakdown` | `column`, whose value titles each tile, and `maxColumns?` before wrapping |
| `layout` | `density`, `icon`, `valuePosition`, `labelsAlignment`, `valueAlignment`, `valueSizing`, `secondaryAlignment` |

Rules:

- Every column reference names a column in `data.columns`.
- A bar `max` and a trend `y` are `number` columns; a trend `x` is a `date` or `number` column.
- A `compare` secondary column is a single-valued `number` column, as is the headline `value` column when `background` is a bar or `color` is `bands`.
- A `colors.byKey` key names a tile by its `breakdown` cell, and applies only with a `breakdown`. A key part is the value as a string with each `\` and `:` preceded by `\`; a missing (null) cell is the key part `\null`, which no string produces.
- Trend column references name a column in `background.data.columns`.
- Without a `breakdown`, `data` holds at most one row.
- A `bands` color needs `colors.bands`.
- Percentage bands need a `background` bar or a `breakdown`, which supply the maximum.
- A trend `breakdown` needs a `breakdown` on the metric.

`metricExamples` covers a single value, a comparison, a breakdown with the Other and missing buckets, a trend, huge, tiny and negative values, a missing value, a multivalue headline, long text, and a pre-rendered value with provenance.
