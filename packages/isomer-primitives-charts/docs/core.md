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
  display?: Record<string, string[]>; // pre-rendered strings per column, one per row
}
```

Rows are never reordered, so a selection can refer to them by index. `null` is a missing value, never zero.

`role` says what a column is for. `dimension` columns identify a row (buckets, categories, time) and `metric` columns measure it. Dimensions lead text summaries, a phone layout picks its row header from the first one, and they are what a selection targets.

`source`, on a column or on the table, is opaque to Isomer. A host keeps there what it needs to act on a selection, such as Kibana `Datatable` meta, so it can rebuild a filter from a selected cell.

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

## `source`

```ts
source: {
  kind: 'kibana';
  kibanaVersion: string;
  materializer: string;          // such as 'lens'
  materializerVersion: number;
  spaceId?: string;
  savedObjectType?: string;
  savedObjectId?: string;
  panelId?: string;
  timeRange?: { from: string; to: string }; // absolute ISO 8601
  capturedAt: string;            // ISO 8601
}
```

A node is a static snapshot. A host shows when it was captured, and refreshes it by materializing again from its provenance.

## `losses`

`{ path, kind: 'dropped' | 'approximated' | 'prerendered', note }[]`: what the source had that the node drops or approximates. Studio and hosts can show it, and tests can pin it.
