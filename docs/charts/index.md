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

`ChartsTheme` is resolved host presentation: colors plus typography and geometry
in `tokens`. `createChartTokens` derives baseline roles from the host's font
family, base font size and spacing unit. The host can replace layout roles.
`chartsThemes` (with standalone tokens) is a fallback, **not** Elastic
Charts or Kibana themes. The browser package projects its engine defaults instead.
See [Theme ownership](theme.md) for the application boundary and the Kibana comparison.
`MetricView` accepts a theme directly; runtime React may receive it through
`context.chartTheme`; HTML resolves its explicit theme through the adapter;
snapshot receives its frame theme. Omitted browser context uses light.

`createChartsStyleAdapter(themes)` and `createChartFrame(themes)` use the same
host-resolved light/dark pair for HTML and snapshots. `chartsPack` carries an
adapter bound to `chartsThemes`; `chartFrame` is the matching standalone frame.
The adapter creates a fresh style collector per render, walks the
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
| `metricTrendPrimitive`, `chartsPack` | The primitive and its pack; examples, catalog, schema, styles and all adaptations |
| `metricExamples` | Synthetic Requests, service-health breakdown/progress, aligned secondary trends and collapse examples |
| `MetricView` | Baseline/shared React tree, including the timestamp table |
| `MetricTrendNode`, `MetricViewProps` | Model plus SDK node fields; shared view props |
| `createChartTokens`, `ChartTokenSource`, `ChartTokens` | Host-derived portable layout roles |
| `chartsThemes`, `ChartsThemes`, `chartFrame` | Standalone fallback pair and optional content frame |
| `createChartFrame`, `createChartsStyleAdapter` | Bind the frame and HTML adapter to one host-resolved theme pair |
| `METRIC_GLYPHS` | Semantic direction alternatives, independent of geometry |
| `ChartsRenderContext`, `ChartsTheme` | Optional host event/theme context, frame palette |

`/model` exports:

| Export | Contract |
| --- | --- |
| `metricTrendSchema` | Closed Zod declaration with cross-field validation |
| `MetricTrendModel`, `MetricTile`, `MetricReading`, `MetricFormat` | Inferred, JSON-serializable declarations |
| `compareMetric`, `MetricComparison` | Exact signed difference, optional relative magnitude, neutral-by-default status and display text |
| `alignMetricTrends`, `AlignedMetricPoint` | Sorted union of instants; independent primary/secondary nulls |
| `metricTiles` | Effective tiles after optional homogeneous presentation collapse; never mutates sources |
| `metricTileColor` | Explicit tile, matching palette and chart paint precedence, with independent status |
| `formatMetricValue`, `metricTimeLabel` | Portable text formatting and timezone/offset-aware timestamp labels |
| `metricText` | Shared semantic text adaptation |

`metricTiles`, `metricTimeLabel` and `metricText` are public so another renderer
reuses collapse, time-label and nonvisual rules instead of copying them.
`metricTrendSchema` enforces the authoring budgets: 100 tiles, 2,000 points per
series, 10,000 points across all tiles and series, and 1,000 characters per label.
Relative change is suppressed at a magnitude of 1,000.

The root requires React and Zod peers. `react-dom` belongs to the host rendering
HTML/snapshot through the runtime, not this pack's root. Packages publish
CommonJS for Node, ESM for bundlers and declarations, at the workspace version.

## Source map for reviewers

The public `/model` entry is a curated barrel. `model/declarations.ts` owns field
shapes and inferred types; `model/validation.ts` names the cross-reading and
cross-tile checks. `model/readings.ts` owns formatting and comparison rules,
`model/collapse.ts` owns presentation aggregation, and
`model/presentation.ts` owns alignment, paint selection and nonvisual output.
Those modules remain platform-neutral and keep the same public model exports.
