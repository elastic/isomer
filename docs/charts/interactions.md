---
navigation_title: Interactions
description: What a chart offers a reader (interactions), and the ChartEvent every renderer raises for a gesture.
---

# Interactions and events

Isomer owns gestures and local inspection: tooltips, highlight, legend toggles and keyboard focus. The host owns what an event means: Isomer never builds a filter, navigates or calls a service. With no `onEvent` from the host, a chart offers nothing and raises nothing, which is what `snapshot`, PDF and PNG get.

## `interactions`

Each chart declares what it offers, so every renderer and host agrees:

```ts
interactions?: {
  select?: SelectTarget[];          // absent: nothing is selectable
  brush?: { column: string };       // xyChart only: a date or number column
  sync?: { cursor?: boolean; tooltips?: boolean };
  link?: { href: string; label: string }; // static, drawn on every surface
  initial?: { hiddenSeries?: string[] };  // xyChart only: series keys hidden at first
}
```

| Chart | `select` targets |
| --- | --- |
| `metric` | `tile` |
| `xyChart` | `datum`, `series`, `category`, `legend` |

`emphasis?: { rows: number[]; note?: string }[]` highlights rows statically, such as what an agent is talking about, on every surface.

Rules:

- A `brush` column is a `date` or `number` column used as `x` by at least one `data` layer.
- Emphasis rows are indexes into `data.rows`.

## `ChartEvent`

Events ride the SDK's `onEvent(ActionEventRef)` as `chart.select` and `chart.brush`, with the event as `context`. `toActionEvent(event)` wraps one; `readChartEvent(ref)` reads and validates one, returning `undefined` for anything else.

```ts
type ChartEvent = {
  node: string;                     // the node's `id`
  description: string;              // in words from the Scene
  values: Record<string, Cell>;     // the raw value of each referenced column
} & (
  | {
      kind: 'select';
      target: 'datum' | 'series' | 'legend';
      seriesKey: string;
      series: { layer: number; y: number };
      rows: number[];
      columns: string[];
      negate?: boolean;
    }
  | {
      kind: 'select';
      target: 'category' | 'cell' | 'tile';
      rows: number[];
      columns: string[];
      negate?: boolean;
    }
  | { kind: 'brush'; column: string; range: [number, number] }
);
```

An event refers to data, never to pixels: `rows` are indexes into the node's `data.rows`, and `columns` are the dimension columns that identify the target, whose value every row in `rows` shares. A click in the SVG renderer, Elastic Charts or ECharts, and a tap on a phone, raise the same event. A renderer raises no event for a node without an `id`.

`datum`, `series` and `legend` selections carry `seriesKey`, using the [xyChart series-key rule](xy-chart.md), and `series`, the `{ layer, y }` indexes identifying the chosen y entry. The indexes distinguish different y series across layers even when their keys and source rows match; an empty key is valid.

| Target | `rows` | `columns` |
| --- | --- | --- |
| `datum` | The mark's row | Its x and split columns |
| `series`, `legend` | Every row of the series | Its split column |
| `category` | Every row at that x | The x column |
| `tile` | The tile's row | Its breakdown column, if any |

`negate` marks a "filter out" gesture. A brush `range` is in the x column's units: epoch milliseconds for a date.

A Kibana host rebuilds Kibana's click and range contexts from the node's `data` and the opaque column `source`, and fires its triggers; a host without Kibana's UI actions asks the Kibana server to turn the event into filters. Either way it keeps filters as its state and materializes the node again.

`chartEventExamples` lists events on the `xyChart` example "Interactive stacked bars": a bar segment, the missing bucket, a filtered-out legend item, an x category and a brushed range.
