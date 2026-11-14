---
navigation_title: partitionChart
description: Parts of a whole as a pie, donut, treemap, mosaic or waffle, as Lens draws them.
---

# `partitionChart`

Parts of a whole, on the [chart core](core.md). Lens's pie, donut, treemap, mosaic and waffle charts materialize into it. Each `groups` column is one layer of slices, outermost first, and a slice's size is the sum of its rows' `metrics` values.

| Field                      | What it is                                                                                                                                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shape`                    | `pie` and `donut`: rings of sectors, one ring per layer. `treemap`: nested rectangles. `mosaic`: columns by the first group, each split by the second. `waffle`: a 10 × 10 grid of squares                                                                        |
| `metrics`                  | `[{ column }]`: what sizes the slices. Several metrics add one more, innermost, layer with a slice per metric, named by its column label                                                                                                                          |
| `groups`                   | `[{ column }]`: the layers, outermost first. Absent or empty means one slice per metric                                                                                                                                                                           |
| `labels`                   | `categories` (`auto`, `inside` or `hidden`; default `auto`, which lets a pie or donut draw a name outside a slice too small for it), `values` (`percent`, `value` or `hidden`; default `percent`), `percentDecimals` (0 to 10; default 2, trailing zeros dropped) |
| `donutHole`                | The hole's radius as a share of the donut's, strictly between 0 and 1. Default 0.3                                                                                                                                                                                |
| `legend`                   | `visibility` (`auto` shows it on a waffle, and on a pie or donut with more than one layer), `position` (default `right`), `nested` (every layer, each slice under its parent), `maxLines` (default 1), `size`, `values` (each slice's value; default on a waffle) |
| `interactions`, `emphasis` | Selectable `slice`s, a link and static highlights: [Interactions](interactions.md)                                                                                                                                                                                |

A missing or non-number value counts as 0. Any negative value leaves the chart empty with Lens's note, "_Shape_ chart can't render with negative values.", naming the chart's shape (a donut says "Donut chart can't render with negative values."), and a chart with no rows, or only zeros, says "No results found".

A `colors.byKey` key names a color category: the outermost group's cell, or on a `mosaic` with two groups the second group's cell; with no `groups`, a metric column id. Each is a key part, as the [chart core](core.md#colorvalue) encodes one: the missing bucket is `\null`. A category with no key takes the default categorical palette by where it first shows in the rows; a date category is one instant however its cells write it, so it takes one color in every mosaic column.

## Example

The fewest fields that validate and draw, one pie layer:

<!-- node-example -->

```ts
import type { PartitionChartNode } from '@elastic/isomer-primitives-charts/schema';

const requestsByStatus: PartitionChartNode = {
  type: 'partitionChart',
  shape: 'pie',
  data: {
    columns: [
      { id: 'status', label: 'Status', type: 'string', role: 'dimension' },
      {
        id: 'count',
        label: 'Count of records',
        type: 'number',
        role: 'metric',
      },
    ],
    rows: [
      ['200', 8412],
      ['404', 1204],
      ['500', 382],
    ],
  },
  metrics: [{ column: 'count' }],
  groups: [{ column: 'status' }],
};
```

A typical panel, a titled donut with a color per slice for both schemes, a legend and selectable slices:

<!-- node-example -->

```ts
import type { PartitionChartNode } from '@elastic/isomer-primitives-charts/schema';

const trafficByCountry: PartitionChartNode = {
  type: 'partitionChart',
  title: 'Traffic by country',
  shape: 'donut',
  donutHole: 0.54,
  data: {
    columns: [
      {
        id: 'country',
        label: 'geo.country_iso_code',
        type: 'string',
        role: 'dimension',
      },
      {
        id: 'count',
        label: 'Count of records',
        type: 'number',
        role: 'metric',
      },
    ],
    rows: [
      ['US', 4120],
      ['DE', 1830],
      ['Other', 2410],
    ],
  },
  metrics: [{ column: 'count' }],
  groups: [{ column: 'country' }],
  colors: {
    byKey: {
      US: { light: '#16C5C0', dark: '#16C5C0' },
      DE: { light: '#61A2FF', dark: '#61A2FF' },
      Other: { light: '#CAD3E2', dark: '#485975' },
    },
  },
  legend: { visibility: 'visible', position: 'right' },
  interactions: { select: ['slice'] },
};
```

Rules:

- Every column reference names a column in `data.columns`.
- A `metrics` column is a `number` column.
- The `metrics` and `groups` columns are not `multivalue`.
- A column appears at most once across `metrics` and `groups`.
- `groups` holds at most 3 columns on a `pie` or `donut`, 2 on a `treemap` or `mosaic`, and 1 on a `waffle`.
- A `mosaic` takes one metric.
- Only a `donut` has a `donutHole`.
- Emphasis rows are indexes into `data.rows`.

## How it resolves

The Scene's `kind` is `partition`. Expected values come from Lens's partition visualization:

- **Slices** group rows by their group cells, a date by its instant; rows that share a path are one slice that keeps every row. Each slice's `value` is the sum of its leaves in draw order, as an engine sums them, so the two agree to the last bit. A sum past `Number.MAX_VALUE` is held at it, as are the Scene's `total`, and shares still come from the exact proportions.
- **Order:** largest first, ties in row order. A mosaic's columns, and a lone mosaic layer, keep row order; the metric layer keeps metric order.
- **Colors:** a category's `colors.byKey` entry, else the categorical palette by where it first shows. An inner layer takes its outermost slice's color mixed toward the background in LCH by a fifth per layer, at most four fifths, as Lens's `decreaseOpacity` does; a translucent color's alpha mixes too. A two-layer mosaic colors its inner slices by their own category and leaves its columns transparent.
- **Text:** a slice's name is its group cell as displayed (its `display` string, else its format), or its metric's label. Its `valueText` is its value in its metric's format, or the first metric's above the metric layer; a one-row slice of one metric uses that cell's `display` string. Its `percentText` is its share of the whole as a percent with at most `percentDecimals` digits. `valueLabel` is whichever `labels.values` names, empty when names are hidden.
- **Legend:** flat, the outermost slices in the order their rows first show them; nested, every slice depth first in draw order. As in Kibana, a two-group `mosaic` hides its legend unless `visibility` is `visible`, and a flat one then lists its columns, which are transparent, rather than the inner categories that carry color.
- **Selections:** each slice and legend item carries a `slice` selection when the node offers it: the slice's rows, the group columns on its path and their cells.
- **Summary:** the metrics, the groups, then each outermost slice with its share.

## Surfaces

The [Elastic Charts engine](../../isomer-charts-elastic/docs/index.md) draws it in the browser. On Node it draws only through a host's engine that collects the same specs (`sceneSpecs`); without one, `snapshot`, and so a Slack picture, draws the pack's [fallback](rendering.md#choosing-a-renderer), the summary sentence. Without a host size it takes a 16:9 box, as an `xyChart` that fills its container does, and `snapshotHeight` reports it. Text and Markdown write the summary, the description, each emphasis note and the data table. On Slack it is a picture asset, as `metric` and `xyChart` are.

`partitionChartExamples` covers a pie, a donut with Other and missing buckets, a nested pie with values and a nested legend, a treemap, a mosaic, a waffle over a date group, several metrics, huge, tiny, zero and missing values, negative values, no rows, and selectable slices with pre-rendered names, emphasis, a link and provenance.
