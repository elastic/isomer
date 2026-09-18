---
type: Playbook
title: Rasterize svg
description: Hand the svg surface result to createTakumiImageBackend.
tags: [isomer, image-takumi, playbook]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.6, at: 2026-09-18T22:35:00Z }
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/docs/index.md
    title: Package docs
  - id: backend
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/src/backend.ts
    title: Takumi backend
---

# Steps

1. Render with `runtime.surfaces.svg.render(composition)`.
2. Construct `createTakumiImageBackend({ fonts })` with the faces the pack's theme names.
3. Call `.png(...)` or `.svg(...)`.[^docs][^backend]

Related: [raster](/image-takumi/concepts/raster.md), [fonts](/image-takumi/concepts/fonts.md).

[^docs]: Package docs

[^backend]: Takumi backend
