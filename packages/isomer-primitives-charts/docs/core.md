---
navigation_title: Chart core
description: "The fields every chart primitive shares: typed columnar data, colors, portable formats, provenance and losses."
---

# Chart core

Every chart primitive spreads `chartCoreShape` into its schema.

| Field | What it is |
| --- | --- |
| `title`, `description` | Shown on every surface; `description` is what the chart shows, for accessible and text surfaces |
| `data` | Typed columnar data, as the source table holds it |
| `colors` | Data colors resolved by whoever built the node |
| `source` | Provenance, never rendered |
| `losses` | What the source had that the node drops or approximates |

## `data`

```ts
data: {
  columns: Array<{
    id: string;                 // stable within the node; everything refers to a column by id
    label: string;
    type: 'number' | 'string' | 'date' | 'boolean';
    role: 'dimension' | 'metric';
    format?: PortableFormat;
    multivalue?: true;
    source?: unknown;           // opaque, never rendered
  }>;
  rows: Cell[][];               // Cell = number | string | boolean | null, or an array of those
  source?: unknown;             // opaque table-level meta
  missing?: { null?: string; empty?: string; nan?: string }; // text for cells a format cannot show
  display?: Record<string, string[]>; // pre-rendered strings per column, one per row
}
```

Rows are never reordered, so a selection can refer to them by index. `null` is a missing value, never zero.

`role` says what a column is for. `dimension` columns identify a row (buckets, categories, time) and `metric` columns measure it. Dimensions lead text summaries, a phone layout picks its row header from the first one, and they are what a selection targets.

A complete `data` with one column of each type follows. `host` and `seen` are `dimension` columns, which say which row this is, and `requests` and `healthy` are `metric` columns, which measure it. A `date` cell is epoch milliseconds or an ISO 8601 date-time with a UTC offset, `Z` or `+hh:mm`.

<!-- data-example -->

```ts
import type { ChartData } from '@elastic/isomer-primitives-charts/schema';

const data: ChartData = {
  columns: [
    { id: 'host', label: 'host.name', type: 'string', role: 'dimension' },
    { id: 'seen', label: 'Last seen', type: 'date', role: 'dimension' },
    { id: 'requests', label: 'Requests', type: 'number', role: 'metric' },
    { id: 'healthy', label: 'Healthy', type: 'boolean', role: 'metric' },
  ],
  rows: [
    ['web-01', '2026-11-03T09:15:00+01:00', 4120, true],
    ['web-02', '2026-11-03T08:15:00Z', 6310, false],
    ['db-01', null, null, null],
  ],
};
```

`source`, on a column or on the table, is opaque to Isomer. A host keeps there what it needs to act on a selection, such as Kibana `Datatable` meta, so it can rebuild a filter from a selected cell.

`missing` is the text for cells a format cannot show: a missing (`null`) cell, an empty string, and a number-like value that is not a number. Absent texts are `(null)`, `(blank)` and `NaN`, Kibana's; a host whose source shows them differently states its own.

`display` holds strings for values whose format is outside the portable set (custom, static lookup, URL, color). They replace the formatted value on every surface, and the node records the loss in `losses`.

Rules:

- Column ids are unique.
- Every row has exactly one cell per column, in column order.
- A cell holds its column type or null: a number in a `number` column, a string in a `string` column, a boolean in a `boolean` column, and epoch milliseconds or an ISO 8601 date-time string with a UTC offset (`Z` or `+hh:mm`) in a `date` column. Only a `multivalue` column holds arrays of those.
- Each `display` key names a column and holds one string per row.

## `PortableFormat`

Formats are ECMA-402 `Intl` options, formatted in the locale and time zone the chart is resolved in.

| `kind` | Fields | Meaning |
| --- | --- | --- |
| `number` | `minimumFractionDigits?`, `maximumFractionDigits?`, `signDisplay?`, `useGrouping?`, `notation?`, `suffix?` | As `Intl.NumberFormat`. `signDisplay: 'exceptZero'` signs values that do not round to zero |
| `percent` | The `number` fields without `notation`, and `fractional?` | `fractional: false` means percentages rather than fractions |
| `bytes`, `bits` | The `number` fields without `notation`, `base?` (1000 or 1024), `unitDisplay?` | The largest unit the value is at least one of |
| `duration` | `input`, `output?`, the `number` fields without `notation`, `unitDisplay?` | `input` is the stored unit; `output` a unit, or `auto` for the largest unit the value is at least one of |
| `date` | `timeZone?`, and `dateStyle?` and `timeStyle?` or `weekday?`, `year?`, `month?`, `day?`, `hour?`, `minute?`, `second?`, `fractionalSecondDigits?`, `timeZoneName?`; `hour12?` with either | As `Intl.DateTimeFormat`. Absent `timeZone` means the chart's |
| `text` | — | The value as a string |

Rules:

- A date format uses `dateStyle` and `timeStyle`, or individual date and time fields, not both.

A host whose formats have no portable equivalent, such as Kibana's field formats, maps each to the nearest portable one or sends `data.display` strings; it never formats at render time.

[Format](format.md) formats every kind.

## `ColorValue`

```ts
type ColorValue =
  | { light: string; dark: string }            // data colors: always concrete
  | { token: ChromeToken }                     // chrome only
  | { palette: 'categorical'; index: number }; // charts authored with no palette of their own
```

Colors are `#rgb`, `#rrggbb` or `#rrggbbaa`. `ChromeToken` is one of `text`, `textSubdued`, `axis`, `gridLine`, `background` and `border`. The scheme is always chosen explicitly when a node is drawn, so a renderer never relies on CSS `light-dark()` alone.

`colors.byKey` maps a series or category key to a color; each chart states what its keys are (`metric` by its `breakdown` cell, `xyChart` by series), and each key part is escaped so a missing cell (`\null`) never collides with the string "null". `colors.bands` colors by value range: `from` is inclusive, `to` exclusive except on the last band, and an absent bound is open. Each band with both bounds has `from` below `to`, and bands ascend without overlapping.

## Glyphs

A metric `layout.icon` and a reference line or annotation `icon` name a glyph. Each glyph is defined by what it shows, and drawn by default as its EUI icon type; for a glyph EUI has no icon for, or in an engine without EUI, the engine draws the same subject. A host maps its own icons to these names. `CHART_GLYPHS`, on `./scene` as well as `./schema`, holds this table.

| Glyph | Shows | Drawn by default as EUI's icon type |
| --- | --- | --- |
| `alert` | A warning triangle with an exclamation mark | `alert` |
| `asterisk` | An asterisk | `asterisk` |
| `bell` | A bell | `bell` |
| `bolt` | A lightning bolt | `bolt` |
| `bug` | A bug | `bug` |
| `circle` | A filled circle | `dot` |
| `comment` | A speech bubble | `editorComment` |
| `external` | A box with an arrow leaving its corner | `external` |
| `flag` | A flag on a pole | `flag` |
| `globe` | A globe | `globe` |
| `heart` | A heart | `heart` |
| `marker` | A map pin marking a location | `mapMarker` |
| `pin` | An outlined push pin | `pin` |
| `pinFilled` | A filled push pin | `pinFilled` |
| `processor` | A processor chip | `compute` |
| `sortDown` | An arrow pointing down | `sortDown` |
| `sortUp` | An arrow pointing up | `sortUp` |
| `star` | An outlined star | `starEmpty` |
| `starFilled` | A filled star | `starFilled` |
| `tag` | A price tag | `tag` |
| `temperature` | A thermometer | `temperature` |
| `triangle` | A filled triangle pointing up | None; the engine draws it |

## `source`

```ts
source: {
  host: string;                  // such as 'kibana' or an agent
  hostVersion?: string;
  capturedAt: string;            // ISO 8601
  timeRange?: { from: string; to: string }; // absolute ISO 8601
  meta?: Record<string, unknown>; // host-defined, opaque, never rendered
}
```

A node is a static snapshot. A host shows when it was captured, and refreshes it by building it again from its provenance. What only the host needs to do that, such as Kibana's saved object, panel and materializer, goes in `meta`.

## `losses`

`{ path, kind: 'dropped' | 'approximated' | 'prerendered', note }[]`: what the source had that the node drops or approximates. Studio and hosts can show it, and tests can pin it.
