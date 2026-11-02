---
navigation_title: Charts
description: Portable metric/trend declarations, primitive, theme and nonvisual adaptations.
---

# Charts

`@elastic/isomer-primitives-charts` owns the portable `metricTrend` vocabulary.
`/model` is platform-neutral: Zod schemas, inferred serializable types and pure
formatting, alignment, comparison and collapse helpers. It reaches no React,
SDK, runtime, browser engine or Lens module. The root adds the SDK primitive,
React baseline, pack, collector and frame. Both entries use named exports.

This slice deliberately contains only metric/trend. There are no gauges,
form-based Lens plans, Lens binders, saved-object interpretation, paste-to-render
flows, data fetching or side effects. Hosts supply resolved data and dispatch
named action events. See the [semantic inventory](metric.md).

## Runtime integration

```ts
import { chartFrame, chartsPack, metricExamples } from '@elastic/isomer-primitives-charts';
import { createIsomerRuntime } from '@elastic/isomer-runtime';

const runtime = createIsomerRuntime({
  packs: [chartsPack],
  frames: { chart: chartFrame },
});
const composition = { type: 'view' as const, body: [metricExamples[0]!] };
const checked = runtime.validate(composition);
if (!checked.valid) throw new Error(JSON.stringify(checked.errors));
runtime.surfaces.text.render(composition);
runtime.surfaces.snapshot.render(composition, { theme: 'dark' });
```

`chartFrame` sizes to content and supplies `ChartsTheme` in both modes. All frames
in this runtime must supply that same theme; do not combine it with the unrelated
slides palette. A shared Studio app may hold separate homogeneous runtimes.
The [browser adapter](../renderers-elastic-charts/index.md) replaces
only React, before runtime inventory composition. It never replaces collection.

## Theme and surfaces

`CHART_THEME` is the authoring source for pack-owned lengths, fonts, ratios and
glyphs; `chartsThemes` owns the light/dark palette. Custom `ChartsTheme` supplies
mode, background, text, muted, border, accent, secondary, track and tone colors.
Theme colors use opaque six-digit hex; malformed contrast inputs throw rather
than silently choosing unreadable text.
`MetricView` accepts a theme directly; runtime React may receive it through
`context.chartTheme`; HTML resolves its explicit theme through the adapter;
snapshot receives its frame theme. Omitted browser context uses light.

`chartsStyleAdapter` creates a fresh `ChartStyleCollector` per render, walks the
whole inventory's child tree and runs each definition's collector before markup.
`metricTrendPrimitive.collectStyles` records the metric stylesheet. The
`isomer-metric-v1` collector tag rejects an incompatible adapter at construction.
Its CSS stays scoped to `.isomer-metric`. Theme-dependent geometry and paint are
inline so the baseline React tree works without a browser stylesheet. SVG paint
is literal, never a stylesheet reaching into SVG.

HTML and snapshot use the same baseline React tree; there is no snapshot
renderer. It includes readable values, signed comparison descriptions, explicit
status and progress, accessible trend labels and expandable timestamp tables.
Text and Markdown retain all effective tile readings and trend rows. Markdown
escapes author text with the SDK's `md`; Slack uses the SDK's Markdown fallback,
fitting Slack's limits without an image-upload dependency. Large outputs are
subject to those surface limits, not promised identical layouts.

An action is a labeled button only when `context.onEvent` exists. Keyboard
activation raises its JSON event; otherwise every surface explicitly describes
the unavailable host interaction. No action navigates, fetches or executes.
Hidden/tooltip secondary labels remain available in the summary and data table.
Direction and status are always words as well as color/glyph.

The runtime retains its normal validation posture: React does not validate;
parse/validate and outbound surfaces apply their existing budgets and policies.
Do not pass untrusted models directly to `MetricView` or pure helpers.

## Public API

The root exports the `/model` API below, plus:

| Export | Contract |
| --- | --- |
| `metricTrendPrimitive`, `chartPrimitives`, `chartsPack` | One primitive and its hand-maintained inventory; examples, catalog, schema, styles and all adaptations |
| `metricExamples` | Synthetic Requests, service-health breakdown/progress, aligned secondary trends and collapse examples |
| `MetricView`, `MetricDataTable` | Baseline/shared React tree and timestamp table |
| `MetricTrendNode`, `MetricViewProps` | Model plus SDK node fields; shared view props |
| `CHART_THEME`, `chartsThemes`, `chartFrame` | Design source, palettes and optional content frame |
| `chartsStyleAdapter`, `CHART_STYLE_COLLECTOR` | HTML/snapshot styling and compatibility tag |
| `ChartStyleCollector`, `ChartsRenderContext`, `ChartsTheme` | Collector, optional host event/theme context, frame palette |
| `metricContrast` | Black/white contrast choice for opaque six-digit authored colors |

`/model` exports:

| Export | Contract |
| --- | --- |
| `metricTrendSchema`, `metricFormatSchema` | Closed Zod declarations with cross-field validation |
| `MetricTrendModel`, `MetricTile`, `MetricReading`, `MetricFormat` | Inferred, JSON-serializable declarations |
| `compareMetric`, `MetricComparison` | Exact signed difference, optional relative magnitude, neutral-by-default status and display text |
| `alignMetricTrends`, `AlignedMetricPoint` | Sorted union of instants; independent primary/secondary nulls |
| `metricTiles` | Effective tiles after optional homogeneous presentation collapse; never mutates sources |
| `metricTileColor` | Explicit tile, matching palette and chart paint precedence, with independent status |
| `formatMetricValue`, `metricTimeLabel` | Portable text formatting and timezone/offset-aware timestamp labels |
| `metricText` | Shared semantic text adaptation |
| `METRIC_LIMITS` | 100 tiles, 2,000 points per series, 10,000 points across all tiles/series, 1,000 characters per label; relative-change suppression threshold 1,000 |

The root requires React and Zod peers. `react-dom` belongs to the host rendering
HTML/snapshot through the runtime, not this pack's root. Packages publish
CommonJS for Node, ESM for bundlers and declarations, at the workspace version.
