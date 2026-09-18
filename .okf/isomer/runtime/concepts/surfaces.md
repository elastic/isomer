---
type: Concept
title: Surfaces
description: Six render targets. svg reuses react and needs a frame.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/surfaces.md
tags: [isomer, runtime, surfaces]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.7, at: 2026-09-22T00:50:00Z }
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/surfaces.md
    title: Surfaces
  - id: svg
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/surfaces/svg.ts
    title: svg surface
  - id: embedding
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/embedding.md
    title: Embedding a view
---

# Definition

The runtime exposes `react`, `html`, `text`, `markdown`, `slack`, and `svg`. `html` returns `{ html, css, body, measurement, validationErrors }`. Putting that pair on a host page is a shadow-root recipe in the embedding doc: attach the stylesheet to the shadow root and set `:host { all: initial; display: block }`. The runtime ships no mount helper. `html` collects findings on `validationErrors`; `text`, `markdown`, `slack`, and `svg` throw `CompositionValidationError` by default, and `onValidationError: 'collect'` renders anyway.[^docs][^embedding]

`slack.renderNode` returns the same `{ text, blocks, assets }` as `render`, with `collectAssets` and `assetPrefix` honoured. `react.renderNode` takes `ReactRenderNodeOptions`, which drops `heading`.[^docs]

`svg` returns `{ element, css, width, height }` — the same React tree the DOM gets, plus the pack stylesheet and viewport. Rasterizing that result is [takumi](/image-takumi/concepts/raster.md).[^svg]

Related: [runtime](/runtime/concepts/runtime.md), [frame](/runtime/concepts/frame.md).

[^docs]: Surfaces

[^svg]: svg surface

[^embedding]: Embedding a view
