---
navigation_title: Vega
description: A Vega or Vega-Lite spec with inline data, drawn by the Vega runtime on every surface, with the charts pack's node conventions.
---

# Isomer Vega

`@elastic/isomer-primitives-vega` is a pack with one primitive, `vega`: a Vega or Vega-Lite spec with its data inline, drawn by the real Vega runtime. It is for the chart no [chart primitive](../charts/index.md) can draw, and for Kibana's Vega panels. It is a separate pack from the charts pack, and keeps the charts pack's node conventions: provenance, `losses`, a typed `data` table, portable formats, `ChartEvent`s and the link line.

```ts
import { chartsFrame } from '@elastic/isomer-primitives-charts';
import { vegaPack } from '@elastic/isomer-primitives-vega';

const runtime = createIsomerRuntime({
  packs: [vegaPack],
  frames: { charts: chartsFrame },
});
```

The package is `"private": true` while the charts pack is, and depends on it.

## Entries

| Entry | Holds |
| --- | --- |
| `@elastic/isomer-primitives-vega/schema` | The contract: `vegaSchema`, `VegaNode`, `vegaCatalog`, the examples, and the spec rules. It reaches no Vega, React or runtime, so a client that cannot load Vega, such as a React Native app, validates nodes with it. |
| `@elastic/isomer-primitives-vega` | Everything above, the pack, `renderVegaSvg` and `toVegaSpec` for a host that draws on a server, `pruneVegaResults` for a materializer, the theme and `vegaStylesheet`. It reaches Vega and React. |
| `@elastic/isomer-primitives-vega/client` | `hydrateVega`, which makes `html` output live in a browser. |

`vegaSchema` checks everything but whether Vega parses the spec. The pack's primitive validates with `vegaPrimitiveSchema`, which adds that check, so validate through a runtime that registers the pack.

## The node

```ts
{
  type: 'vega';
  mode: 'vega' | 'vega-lite';
  spec: Record<string, unknown>;
  title?: string;
  description: string;
  data?: ChartData;
  width?: number;    // 16–4096
  height?: number;   // 16–4096
  interactions?: {
    select?: ['mark'];
    brush?: { column: string; signal: string };
    link?: { href: string; label: string };
  };
  results?: { path: (string | number)[]; values: unknown; scope: 'static' }[];
  basemap?: { tiles: { src; x; y; width; height }[]; attribution?: string };
  source?: Provenance;
  losses?: Loss[];
}
```

| Field | What it is |
| --- | --- |
| `mode` | The grammar `spec` is written in |
| `spec` | The spec, with its data inline under `values` or Vega-Lite `datasets`. Nothing loads by URL |
| `title`, `description` | `description` is one sentence saying what the chart shows: the alt text, and the sentence text surfaces lead with, after the title |
| `data` | A typed table, the [chart core's](../charts/core.md#data), that the spec reads as the dataset named `table`. Text surfaces show it, formatted, and selections refer to its rows |
| `width`, `height` | The chart's box in CSS pixels, axes and legends included. Absent: the box a container gives it, else 480 × 270, the charts pack's 16:9 |
| `interactions` | What the chart [raises](#interactions), and a static link drawn on every surface |
| `results` | Host-stamped query results, each replacing the `url` of the data entry at its `path`. See [Materializing](materializing.md#results) |
| `basemap` | Host-stamped map tiles drawn beneath the chart. See [Materializing](materializing.md#map-mode) |
| `source`, `losses` | The chart core's [provenance](../charts/core.md#source) and [losses](../charts/core.md#losses), never rendered |

`results` and `basemap` are for hosts: their descriptions tell a model not to set them.

### Rules

- A spec reaches nothing outside itself. Validation reports every `url` (data sources, lookups, image marks), every `href` and every bound input's `element`, at its path; rows under `values` and `datasets` are data and are not inspected. Anything nested deeper than 64 levels is refused.
- A data source keeps its `url` only where a `results` entry replaces it, and each `results` path names a data entry of the spec: an entry of a Vega `data` array, or a Vega-Lite `data` object.
- Kibana map mode, `config.kibana.type: "map"`, is refused: a [materializer converts it](materializing.md#map-mode). Every other `config.kibana` key is dropped, since only Kibana's own view reads them.
- With `data`, the spec reads it as the dataset named `table`: a Vega spec declares `{ "name": "table" }` in `data` with no `values`, `url` or `source`, and a Vega-Lite spec reads `"data": { "name": "table" }` and declares no `datasets.table`. The pack fills it with one object per row keyed by column id, dates as epoch milliseconds.
- `interactions.select` and `interactions.brush` need `data`, and a `brush` column is a `date` or `number` column of `data`.
- The spec compiles and parses: Vega-Lite compiles, and Vega parses it with the expression interpreter, so an unknown function, such as Kibana's `kibanaAddFilter`, fails at `spec`.
- A spec is at most 250,000 characters of JSON, `data` at most 10,000 rows, and `results` at most 16 entries and 250,000 characters. A basemap is at most 16 inline PNG, JPEG or WebP `data:` tiles.
- A chart draws at most 5,000 SVG elements, axes and legends included: one per mark item, and one per line, area or trail, which draw as one path. Past that it draws its fallback note. Validation does not run the dataflow, so this is checked when the chart draws; [Rendering](rendering.md#limits) says why. The pack declares the charts pack's [input budget](../sdk/packs.md#inputbudget), 250,000 values and 10,000,000 characters.

## Interactions

Events ride the SDK's `onEvent` as the charts pack's [`ChartEvent`](../charts/interactions.md#chartevent), and only for a node with an `id`. With no `onEvent`, a chart raises nothing.

- **`select: ['mark']`**: a click on a mark raises a `select` whose `target` is `mark`. `columns` are the dimension columns of `data` the mark's datum carries, by column id; `rows` are every row holding the datum's values in them. An aggregated mark, which keeps only its group-by fields, selects every row of its group. A datum that carries no dimension column, or matches no row, raises nothing.
- **`brush: { column, signal }`**: each value of the named signal that is two numbers or dates, `[from, to]`, raises a `brush` on `column`, ordered and in the column's units. The spec decides when the signal changes, so a spec that sets it on release raises one brush per gesture.

`markSelectEvent` and `signalBrushEvent` build these events from a datum and a signal value, for a host that runs its own view.

Vega's own signals, tooltips and hover keep working in a live view; they are local inspection and raise nothing.

## Pages

- [Rendering](rendering.md): every surface, the theme, sizing, styling, images, measurements, and why the pack has no Scene.
- [Materializing](materializing.md): what a Kibana Vega materializer does before Isomer sees a node.
