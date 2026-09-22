---
type: Concept
title: Raster
description: createTakumiImageBackend rasterizes the svg surface's { element, css, width, height }.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/src/backend.ts
tags: [isomer, image-takumi]
status: stable
stale_after: 2027-03-18
sources:
  - id: backend
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/src/backend.ts
    title: Takumi backend
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/docs/index.md
    title: Package docs
---

# Definition

The `svg` surface returns `{ element, css, width, height }`. This package serializes that tree, hands it to takumi's `fromHtml`, and lays it out. PNG or SVG out; nothing else. `ImageInput` is declared structurally, so this package depends on no isomer package.[^backend][^docs]

Related: [surfaces](/runtime/concepts/surfaces.md), [fonts](/image-takumi/concepts/fonts.md), [rasterize svg](/image-takumi/playbooks/rasterize-svg.md).

[^backend]: Takumi backend

[^docs]: Package docs
