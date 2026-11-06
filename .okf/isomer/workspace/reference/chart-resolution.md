---
type: Reference
title: Chart resolution
description: Portable chart resolution preserves authored text, source identity and deterministic geometry.
tags: [isomer, charts, scene]
status: stable
sources:
  - id: scene
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-charts/docs/scene.md
    title: Scene contract
---

# Definition

`resolveChart` uses ordinal positions for mixed x-column types and validates non-missing cells incompatible with a continuous scale at their data-cell paths. It reads each layer's own x column and retains raw cells in tables and selections. Cell-valued legend statistics and summary extrema retain authored display text. Numeric and date arrays use the first non-null element for coordinates; their labels and source values retain the full cell.[^scene]

Full domains include zero for bars and areas; fitted singleton domains widen around their value. Automatic points use projected neighbor distances. Singleton time domains span their local calendar day within the supported Date range, and hourly ticks stay on local hours across fractional-hour daylight-saving changes. Metric overlays contrast with colored tile backgrounds.[^scene]

[^scene]: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-charts/docs/scene.md

Brush endpoint descriptions use the brush column's plotted values and display strings, even when mixed x types require an ordinal axis.[^scene]
