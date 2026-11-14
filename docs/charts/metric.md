---
navigation_title: metric
description: One headline value, or one tile per row, with an optional secondary value, progress bar or trend line.
---

# `metric`

One headline value, or one tile per row of `data`, on the [chart core](core.md).

Lens's metric materializes into it; its legacy metric materializes into [`legacyMetric`](legacy-metric.md).

| Field                      | What it is                                                                                                                                                                                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                    | `column`, `subtitle?`, `color?` (a `ColorValue`, or `bands` to color by `colors.bands`), `bandsRange?` (`absolute`, or `percentage` from 0 to the bar's `max`, across the range of tiles, or from 0 to twice a lone value), `applyColorTo?` (`value` or `background`) |
| `secondary`                | `column`, `showLabel?`, `labelPlacement?` (`before`, `after`, `tooltip`), `color?`, `compare?`                                                                                                                                                                        |
| `secondary.compare`        | `to` (`baseline` or `primary`), `baseline?`, `showIcon?`, `showValue?`, and `colors: { increase, decrease, neutral }`                                                                                                                                                 |
| `background`               | `{ kind: 'bar', max, orientation? }`, a progress bar to the `max` column; or `{ kind: 'trend', data, x, y, breakdown? }`, a trend line from its own table                                                                                                             |
| `breakdown`                | `column`, whose value titles each tile, and `maxColumns?` before wrapping                                                                                                                                                                                             |
| `interactions`, `emphasis` | Selectable tiles, a link and static highlights: [Interactions](interactions.md)                                                                                                                                                                                       |
| `layout`                   | `density`, `icon` (a [glyph](core.md#glyphs) and its `alignment`), `valuePosition`, `labelsAlignment`, `valueAlignment`, `valueSizing`, `secondaryAlignment`                                                                                                          |

Values and defaults, where a field is absent:

| Field                                                | Values                       | Absent means |
| ---------------------------------------------------- | ---------------------------- | ------------ |
| `value.bandsRange`                                   | `absolute`, `percentage`     | `absolute`   |
| `value.applyColorTo`                                 | `value`, `background`        | `background` |
| `secondary.showLabel`                                | boolean                      | `false`      |
| `secondary.labelPlacement`                           | `before`, `after`, `tooltip` | `before`     |
| `secondary.compare.baseline`                         | number                       | 0            |
| `secondary.compare.showIcon`, `showValue`            | boolean                      | `true`       |
| `background.orientation` (bar)                       | `horizontal`, `vertical`     | `horizontal` |
| `breakdown.maxColumns`                               | 1 or more                    | 3            |
| `layout.density`                                     | `compact`, `default`         | `default`    |
| `layout.icon.alignment`                              | `left`, `right`              | `right`      |
| `layout.valuePosition`                               | `top`, `middle`, `bottom`    | `bottom`     |
| `layout.labelsAlignment`                             | `left`, `center`, `right`    | `left`       |
| `layout.valueAlignment`, `layout.secondaryAlignment` | `left`, `center`, `right`    | `right`      |
| `layout.valueSizing`                                 | `auto`, `fill`               | `auto`       |

## Example

The fewest fields that validate and draw, one value from one row:

<!-- node-example -->

```ts
import type { MetricNode } from '@elastic/isomer-primitives-charts/schema';

const requests: MetricNode = {
  type: 'metric',
  data: {
    columns: [
      {
        id: 'count',
        label: 'Count of records',
        type: 'number',
        role: 'metric',
      },
    ],
    rows: [[14074]],
  },
  value: { column: 'count' },
};
```

A typical panel, a titled percentage compared with last week's and colored by the direction of the change:

<!-- node-example -->

```ts
import type { MetricNode } from '@elastic/isomer-primitives-charts/schema';

const errorRate: MetricNode = {
  type: 'metric',
  title: 'Error rate',
  data: {
    columns: [
      {
        id: 'rate',
        label: 'Error rate',
        type: 'number',
        role: 'metric',
        format: { kind: 'percent', maximumFractionDigits: 1 },
      },
      {
        id: 'previous',
        label: 'Last week',
        type: 'number',
        role: 'metric',
        format: { kind: 'percent', maximumFractionDigits: 1 },
      },
    ],
    rows: [[0.021, 0.034]],
  },
  value: { column: 'rate', subtitle: 'Past 24 hours' },
  secondary: {
    column: 'previous',
    showLabel: true,
    compare: {
      to: 'primary',
      colors: {
        increase: { light: '#E7664C', dark: '#E7664C' },
        decrease: { light: '#54B399', dark: '#54B399' },
        neutral: { token: 'textSubdued' },
      },
    },
  },
};
```

Rules:

- Every column reference names a column in `data.columns`.
- A bar `max` and a trend `y` are `number` columns; a trend `x` is a `date` or `number` column.
- A `compare` secondary column is a single-valued `number` column, as is the headline `value` column when `background` is a bar or `color` is `bands`.
- A `colors.byKey` key names a tile by its `breakdown` cell, and applies only with a `breakdown`. A key part is the value as a string with each `\` and `:` preceded by `\`; a missing (null) cell is the key part `\null`, and a multivalue cell is `\` followed by the key part of its JSON text, such as `\["a"]`; no string produces either.
- Trend column references name a column in `background.data.columns`.
- Without a `breakdown`, `data` holds at most one row.
- A `bands` color needs `colors.bands`.
- A trend `breakdown` needs a `breakdown` on the metric.
- Emphasis rows are indexes into `data.rows`.

`metricExamples` covers a single value, a comparison, a breakdown with the Other and missing buckets, a trend, huge, tiny and negative values, a missing value, a multivalue headline, long text, and a pre-rendered value with provenance.
