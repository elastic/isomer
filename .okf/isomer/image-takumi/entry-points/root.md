---
type: Entry Point
title: Root
description: '@elastic/isomer-image-takumi createTakumiImageBackend.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/src/index.ts
tags: [isomer, image-takumi, api]
status: stable
stale_after: 2027-03-18
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/src/index.ts
    title: Root barrel
---

# Definition

`createTakumiImageBackend({ fonts? })` returns a `TakumiMeasuringBackend`, `{ png, svg, measure }`. `measure` lays an input out as `png` would and returns its `LayoutBox` tree: each element's canvas `x`, `y`, `width`, and `height`, its `scaleX`, `scaleY`, and `scale` (whichever axis scale is further from 1), its positioned text `runs`, its `attributes` other than `class`, `id`, and `style`, and its `children`. A parent whose laid-out children do not line up one to one with its elements, as when inline content folds into runs, passes no attributes to them. `TakumiImageBackend`, what `renderPng` takes, stays `{ png, svg }`. Font types are re-exported from `@takumi-rs/core`.[^barrel]

Related: [raster](/image-takumi/concepts/raster.md), [public contract](/image-takumi/reference/public-contract.md).

[^barrel]: Root barrel
