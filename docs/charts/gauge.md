---
navigation_title: gauge
description: One value on a scale, as a bullet or a dial, as Lens's gauge draws it.
---

# `gauge`

One value against a scale from `min` to `max`, on the [chart core](core.md). Lens's gauge materializes into it.

| Field          | What it is                                                                                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shape`        | `horizontalBullet` and `verticalBullet`: straight scales with the value as a bar. `semiCircle`, `arc` (two thirds of a circle) and `circle`: round scales with the value as an arc                                                                                                          |
| `value`        | `column`: the `number` column whose value the gauge shows. The gauge reads the first row where it is a number                                                                                                                                                                               |
| `min`, `max`   | `column`: the start and end of the scale, from the same row. Absent `min` is 0, or 10 below the value (or `max`) where either is at most 0; absent `max` is the largest of the value, the goal and the start, rounded up to a readable number, as Lens's `getMinValue` and `getMaxValue` do |
| `goal`         | `column`: a marker on the scale, drawn where it falls between `min` and `max`                                                                                                                                                                                                               |
| `bandsRange`   | `absolute` (default): `colors.bands` bounds are values. `percentage`: they are percentages of the scale from `min` (0) to `max` (100)                                                                                                                                                       |
| `ticks`        | `auto` (default) lets the engine place ticks; `bands` puts them at the band edges, leaving out any within a tenth of the scale of its neighbor or the end; `hidden` draws none                                                                                                              |
| `labels`       | `major`: the gauge's title, absent for the value column's label, false for none. `minor`: a subtitle                                                                                                                                                                                        |
| `interactions` | A static `link`. Nothing on a gauge is selectable, as in Lens                                                                                                                                                                                                                               |

`colors.bands` color the scale; without them it is one neutral color (EUI's `lightShade`), as Lens draws a gauge with no palette. `colors.byKey` does not apply.

A gauge with no value says "No results found"; one whose `min` equals its `max` says "Minimum and maximum values may not be equal"; one whose `min` is above its `max`, "Minimum value may not be greater than maximum value", as Lens does.

## Example

The fewest fields that validate and draw, a bullet whose scale runs from 0 to the value rounded up:

<!-- node-example -->

```ts
import type { GaugeNode } from '@elastic/isomer-primitives-charts/schema';

const requestsToday: GaugeNode = {
  type: 'gauge',
  shape: 'horizontalBullet',
  data: {
    columns: [
      {
        id: 'requests',
        label: 'Count of records',
        type: 'number',
        role: 'metric',
      },
    ],
    rows: [[8412]],
  },
  value: { column: 'requests' },
};
```

A typical panel, a titled semicircle from 0 to 100 in three bands, with a goal and ticks at the band edges:

<!-- node-example -->

```ts
import type { GaugeNode } from '@elastic/isomer-primitives-charts/schema';

const cpuUtilization: GaugeNode = {
  type: 'gauge',
  title: 'CPU utilization',
  shape: 'semiCircle',
  data: {
    columns: [
      {
        id: 'cpu',
        label: 'Mean CPU',
        type: 'number',
        role: 'metric',
        format: {
          kind: 'percent',
          fractional: false,
          maximumFractionDigits: 0,
        },
      },
      { id: 'min', label: 'Minimum', type: 'number', role: 'metric' },
      { id: 'max', label: 'Maximum', type: 'number', role: 'metric' },
      {
        id: 'goal',
        label: 'Target',
        type: 'number',
        role: 'metric',
        format: {
          kind: 'percent',
          fractional: false,
          maximumFractionDigits: 0,
        },
      },
    ],
    rows: [[72, 0, 100, 80]],
  },
  value: { column: 'cpu' },
  min: { column: 'min' },
  max: { column: 'max' },
  goal: { column: 'goal' },
  colors: {
    bands: [
      { from: 0, to: 60, color: { light: '#24C292', dark: '#24C292' } },
      { from: 60, to: 85, color: { light: '#FCD883', dark: '#EAAE01' } },
      { from: 85, to: 100, color: { light: '#F6726A', dark: '#F6726A' } },
    ],
  },
  ticks: 'bands',
};
```

Rules:

- Every column reference names a column in `data.columns`.
- The `value`, `min`, `max` and `goal` columns are single-valued `number` columns.
- A `bandsRange` needs `colors.bands`.

## How it resolves

The Scene's `kind` is `gauge`. Expected values come from Lens's gauge (`expression_gauge`):

- **Scale:** `min` and `max` as stated, else Lens's defaults above.
- **Bands:** the scale split at every band edge within it, each stretch the color of the band it lies in, transparent (`#FFFFFF00`) where no band covers it, as Lens's `normalizeBands` and palette leave it. With no bands, one stretch in the neutral color.
- **Ticks:** with `bands`, the edges as Lens's `getTicksLabels` keeps them; with `hidden`, none; with `auto`, the Scene states none and the engine chooses. Each prints through `formatAxisValue` in the value column's format.
- **Text:** the value as displayed (its `display` string, else its format), the goal in its column's format, the title and subtitle, and the tooltip's names for the hovered value ("Current"), the value (its column's label) and the goal ("Goal"), as Lens names them. The summary sentence gives the value, the scale and the goal.

## Surfaces

The [Elastic Charts engine](../charts-elastic/index.md) draws it with Elastic Charts' `Bullet` in the browser. On Node it draws only through a host's engine that collects the same specs (`sceneSpecs`); without one, `snapshot`, and so a Slack picture, draws the pack's [fallback](rendering.md#choosing-a-renderer), the summary sentence. Without a host size it takes Lens's size spec for its shape (`useGaugeSizeByType`), at most its largest box: 3:1 and 600 px wide for a horizontal bullet, 2:3 and 400 px wide for a vertical one, 2:1.25 for a semicircle, 1.1:1 for an arc and 1:1 for a circle, each at most 600 px wide; `snapshotHeight` reports it. Text and Markdown write the summary, the description and the data table. On Slack it is a picture asset, as the other charts are.

`gaugeExamples` covers a semicircle with bands, a goal and band ticks, a horizontal bullet with Lens's default bounds and a subtitle, a vertical bullet with percentage bands and no ticks, an arc whose bands leave gaps, a circle with a pre-rendered value, a link and provenance, a negative value, a huge value, no value, and bounds the wrong way round.
