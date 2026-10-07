---
type: Concept
title: Surfaces
description: Six render targets. snapshot reuses react, needs a frame, and is the one that is not a format.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/surfaces.md
tags: [isomer, runtime, surfaces]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/surfaces.md
    title: Surfaces
  - id: snapshot
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/surfaces/snapshot.ts
    title: snapshot surface
  - id: embedding
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/embedding.md
    title: Embedding a view
---

# Definition

The runtime exposes `react`, `html`, `text`, `markdown`, `slack`, and `snapshot`. `html` returns `{ html, css, js, body, measurement, validationErrors }` and passes `scheme` through to the adapter, which resolves `light-dark(…)` to one scheme; `snapshot` sets it for its own render. Putting that on a host page is a shadow-root recipe in the embedding doc: render with `css: 'separate'` and `scripts: 'host'`, attach the stylesheet to the shadow root, set `:host { all: initial; display: block }`, and run `js` with `runEnhancementScript` against the inserted `.isomer` section. The runtime ships no mount helper. `html` collects findings on `validationErrors`; `text`, `markdown`, `slack`, and `snapshot` throw `CompositionValidationError` by default, and `onValidationError: 'collect'` renders anyway. Input refused before parsing throws on every validating surface in either mode. Every validating surface renders the copy its validation checked, never the value it was handed, and its `renderNode` validates the node as a one-node view and takes `onValidationError` with its `render` default; `react` does not validate and renders what it is given.[^docs][^embedding]

`react` takes `enhancements` as ids, as `html` does, resolved against the enhancements the runtime's packs register; an id none registers is ignored. Those that apply reach every renderer as `context.enhancements` and turn node anchors on when one asks; each `script` runs once against the `wrapper` section when it mounts, a new composition or node object mounts a fresh section, and without `wrapper` the surface warns once per composition and runs none. A React host rendering into a shadow root collects CSS with Distillate's `liveCollection` and `createDomSink`, and finds a host-driven enhancement's parts with `findNodeElementPairs`.[^docs][^embedding]

`heading: false` leaves the composition's title and subtitle out of `react`, `html`, `text`, `markdown`, and `slack`, including Slack's fallback `text`; it defaults to `true`. `slack.renderNode` returns the same `{ text, blocks, assets }` as `render`, with `collectAssets` and `assetPrefix` honoured. `react.renderNode` and `slack.renderNode` take options without `heading`.[^docs]

`snapshot` returns `{ element, html, css, width, height, warnings }` — the same React tree the DOM gets, `html` as that tree's static markup, the pack stylesheet, and the viewport. It is the one surface that is not a format: a host-side rasterizer turns it into PNG, SVG, or PDF, reading `html` (takumi) or `element` (a React-native backend). `getCapabilities()` reports `surfaces` (what `runtime.surfaces` holds), `formats` (every surface but `snapshot`, then `createIsomerRuntime({ formats })`), and `support` keyed by surface. `warnings` is `{ path, message }[]` for nodes that render measured as 0 because they declare no `metrics.snapshotHeight`, empty when `estimateHeight` never calls `estimateSnapshotHeight` or when `height` is given, with no `surface` field. `anchors: true` renders node anchors into it, for the SDK's `checkLayout`. `renderPages(compositions, options?)` lays several compositions out as one document, `{ pages, css, width, height, warnings }`: one `{ element, html }` page per composition against one stylesheet collected across all of them, every page the tallest estimate unless `height` is given, the first composition's `theme` unless `theme` is given, paths on `warnings` prefixed `pages[n].`, and `EMPTY_PAGES` for an empty list. Rasterizing either result is [takumi](/image-takumi/concepts/raster.md).[^snapshot]

Related: [runtime](/runtime/concepts/runtime.md), [frame](/runtime/concepts/frame.md).

[^docs]: Surfaces

[^snapshot]: snapshot surface

[^embedding]: Embedding a view
