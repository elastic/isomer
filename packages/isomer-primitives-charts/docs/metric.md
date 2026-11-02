---
description: Metric/trend semantics, persisted Lens inventory, explicit portable adaptations and exclusions.
---

# Metric / trend contract

The model is resolved presentation data, not Lens state. A chart has a title,
optional description/locale, one or more keyed `tiles`, optional palette and
layout, and optional homogeneous numeric `collapse`. Every tile has a named
`primary` reading and may have its own title, subtitle, secondary reading,
progress, timestamped trend, status, color, text glyph and host action.

## Authoritative inventory

The persisted Lens inventory was inspected at Kibana revision
`e44f3ef4b8f6427d1827dba2097cbb6a10e6e925`, specifically
[`MetricVisualizationState`](https://github.com/elastic/kibana/blob/e44f3ef4b8f6427d1827dba2097cbb6a10e6e925/src/platform/packages/shared/kbn-lens-common/visualizations/metric/types.ts),
[`toExpression`](https://github.com/elastic/kibana/blob/e44f3ef4b8f6427d1827dba2097cbb6a10e6e925/x-pack/platform/plugins/shared/lens/public/visualizations/metric/to_expression.ts),
[`MetricVis`](https://github.com/elastic/kibana/blob/e44f3ef4b8f6427d1827dba2097cbb6a10e6e925/src/platform/plugins/shared/chart_expressions/expression_metric/public/components/metric_vis.tsx),
[`secondary_metric_info`](https://github.com/elastic/kibana/blob/e44f3ef4b8f6427d1827dba2097cbb6a10e6e925/src/platform/plugins/shared/chart_expressions/expression_metric/public/components/secondary_metric_info.ts)
and its formatter helper. The earlier Isomer chart-spike branch's
`metric_trend/{schema,model,read,examples,metric_trend.test}.ts` supplied additional
portable comparison, band and gap cases, not authoritative Lens mappings.

| Persisted/previous semantics | Portable declaration and evidence |
| --- | --- |
| Primary accessor, numeric/non-numeric values, null | `primary.value`: finite number, text, bounded number/text array or null; no NaN sentinel |
| Field formatting, primary/secondary differences | Separate `format` and optional authoritative text-only `formatted` on each reading; number, compact, percent, currency, bytes, duration, precision, locale, prefix/suffix |
| Secondary accessor, custom label, visibility, alignment | Independent `secondary`; before/after/hidden/tooltip name, own color and format; never invent a prior period |
| Static/dynamic secondary trend, baseline primary or constant | Explicit `secondary.comparison`; down/stable/up palette and icon/value/both; primary baseline computes primary minus secondary, numeric baseline computes secondary minus baseline |
| Absolute/relative change, zero/negative prior readings | Explicit display `value`, `absolute`, `relative`, `both`; relative uses absolute baseline magnitude, omitted for zero or magnitude at least 1,000 |
| Neutral versus good/bad and reversed palettes | `increase` defaults neutral; explicit good/bad reverses status on decrease; optional three-color down/stable/up tuple is independently authorable |
| Primary percentage-point change, rounding | Absolute percent differences are percentage points; relative is percent. Exact numeric direction is retained even if display rounds to zero, matching Lens dynamic badges rather than the old prototype's rounded-direction heuristic |
| Max accessor, show bar, progress direction | Optional `progress` with max, signed min, horizontal/vertical direction, label. Actual reading is retained outside bounds; only the visual fill is bounded. This remains a metric with progress, never a gauge |
| Primary and secondary time accessors | Separate timestamped series with shared timezone, not positional arrays. Union alignment preserves gaps; no fabricated timestamps or interpolation |
| Gaps, offsets, timezone, nonmatching timestamps | Explicit nulls; gap/zero/connect is a drawing policy only. Data tables always retain measured gaps. Offset-aware labels disambiguate DST |
| Breakdown accessor, max columns, min tiles | Ordered keyed tiles, `layout.columns`, `layout.minTiles`; explicit empty visual placeholders are not invented data |
| Collapse function, static maximum | `collapse` supports sum/avg/min/max over homogeneous resolved sources; null-only buckets remain missing. `max: static` preserves equal maxima; aggregate uses the selected operation. Trends aggregate by instant |
| Color, palette, apply color to | Opaque authored hex, ordered inclusive-lower-bound bands, optional labels/status; explicit percent palette domain. Tile color overrides palette then chart color; tile status overrides band status |
| Density, value font, position, primary/secondary/title/icon alignment | Compact/default density, fit/default value font, top/middle/bottom value position, independent text alignments and left/right icon alignment |
| Icon, subtitle, filter click and accessibility | Portable text glyph/subtitle; labeled keyboard-operable action events and readable summary/table. Host maps Lens filters and icon names later |

`model.test.ts` exercises these cases directly; `runtime.test.ts` runs inventory
and surface conformance; the browser adapter's tests assert exact engine inputs
and mounted dev/static behavior. These are independently authored expected
values, not expectations generated by the resolver under test.

## Missing values and comparisons

Null means missing, never zero. A missing comparison side produces N/A and
unavailable direction, not Infinity or a favorable status. Primary and secondary
readings need not share units. A comparison is allowed only for numeric/null
readings; callers choose the secondary difference format explicitly.

`formatted` preserves a host's serialized field-format result as plain text
without interpreting HTML. It does not replace the raw numeric value used by
progress or comparisons. There is intentionally no Kibana field-format parser:
the later Lens binder must preserve field formats it can map, supply safe text
for others, and diagnose unsupported semantics rather than guess.

The relative display falls back to the absolute difference when its denominator
is zero or its magnitude reaches the cap. The exact raw signed difference
drives direction and desirability. The old prototype's suppression of
subprecision directions is not treated as an authoritative Lens rule.

## Trends and collapse

Trend points use UTC epoch milliseconds, bounded to JavaScript's Date range.
Each series must have at least two unique instants. Primary and secondary
may sample different times; their sorted union is the comparison grid. Nulls
inserted by alignment are gaps, not zeros. The primary headline need not equal
the final trend point. Timezone changes labeling, not the instant.

The default gap policy breaks a line. Zero explicitly substitutes zero only for
drawing; connect skips missing drawing points. Line, area and bars are supported.
Tables and text preserve the original gap regardless of drawing policy.
Progress defaults to horizontal; an explicit vertical direction is preserved.

Collapse is explicit presentation aggregation, not a way to plan queries.
Sources must share primary/secondary labels, formats, secondary comparison,
progress minimum/direction, trend policy/timezone and presentation. Preformatted
readings and source actions are rejected so aggregation cannot silently lie.
Sum/avg/min/max ignore missing contributors, but return null when all are missing.
Nonfinite aggregate values or invalid resulting progress domains are rejected.
Source tiles are retained in the declaration, never mutated.

## Boundaries and deliberate adaptations

Lens accessor IDs, saved objects, datasource operations, filter clauses, legacy
prefix/label migrations, named palettes, icon registries, arbitrary field-format
parameters, and execution-time data belong to the later Lens mapping/forms
layer. No host-specific state is smuggled into this primitive.

The browser adapter uses Elastic Charts Metric plus separate timestamped XY
sparklines. This preserves independent secondary series and null gaps that
Metric's numeric-only embedded trend array cannot represent. Progress and trend
may coexist instead of silently choosing one. Layout is an Isomer adaptation,
not a claim of pixel-identical Lens layout.

The baseline React renderer is shared by HTML and snapshots. No rasterizer is
added; an optional host backend may rasterize that tree. Browser engine defaults
remain Elastic Charts' own. Baseline layout and projected host styles travel in
`ChartsTheme.tokens`; see [Theme ownership](theme.md).
See the [real-reference blocker](../../isomer-renderers-elastic-charts/docs/index.md#real-lens-reference-gate).
