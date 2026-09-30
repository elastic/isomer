---
type: Concept
title: Surfaces
description: Six render targets. svg reuses react and needs a frame.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/surfaces.md
tags: [isomer, runtime, surfaces]
status: stable
stale_after: 2027-03-18
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

The runtime exposes `react`, `html`, `text`, `markdown`, `slack`, and `svg`. `html` returns `{ html, css, js, body, measurement, validationErrors }`. Putting that on a host page is a shadow-root recipe in the embedding doc: render with `css: 'separate'` and `scripts: 'host'`, attach the stylesheet to the shadow root, set `:host { all: initial; display: block }`, and run `js` with `runEnhancementScript` against the inserted `.isomer` section. The runtime ships no mount helper. `html` collects findings on `validationErrors`; `text`, `markdown`, `slack`, and `svg` throw `CompositionValidationError` by default, and `onValidationError: 'collect'` renders anyway. Input the SDK refuses before parsing throws on every validating surface in either mode.[^docs][^embedding]

`react` takes `enhancements` as `EnhancementDefinition`s, where `html` takes ids. Those that apply reach every renderer as `context.enhancements` and turn node anchors on when one asks; each `script` runs once against the `wrapper` section when it mounts, a new composition or node object mounts a fresh section, and without `wrapper` the surface warns and runs none. A React host rendering into a shadow root collects CSS with Distillate's `liveCollection` and `createDomSink`, and finds a host-driven enhancement's parts with `findNodeElementPairs`.[^docs][^embedding]

`heading: false` leaves the composition's title and subtitle out of `react`, `html`, `text`, `markdown`, and `slack`, including Slack's fallback `text`; it defaults to `true`. `slack.renderNode` returns the same `{ text, blocks, assets }` as `render`, with `collectAssets` and `assetPrefix` honoured. `react.renderNode` and `slack.renderNode` take options without `heading`.[^docs]

`svg` returns `{ element, css, width, height }` — the same React tree the DOM gets, plus the pack stylesheet and viewport. `anchors: true` renders node anchors into it, for the SDK's `checkLayout`. `renderPages(compositions, options?)` lays several compositions out as one document, `{ pages, css, width, height }`: one root per composition against one stylesheet collected across all of them, every page the tallest estimate unless `height` is given, the first composition's `theme` unless `theme` is given, and `EMPTY_PAGES` for an empty list. Rasterizing either result is [takumi](/image-takumi/concepts/raster.md).[^svg]

Related: [runtime](/runtime/concepts/runtime.md), [frame](/runtime/concepts/frame.md).

[^docs]: Surfaces

[^svg]: svg surface

[^embedding]: Embedding a view
