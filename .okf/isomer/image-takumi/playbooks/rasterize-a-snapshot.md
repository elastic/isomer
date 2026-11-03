---
type: Playbook
title: Rasterize a snapshot
description: Hand the snapshot surface result to createTakumiImageBackend.
tags: [isomer, image-takumi, playbook]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/docs/index.md
    title: Package docs
  - id: backend
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/src/backend.ts
    title: Takumi backend
---

# Steps

Render with the `snapshot` surface, build the backend with the theme's fonts, pass its `formats` to the runtime, and call `png`, `svg`, or `renderPng`. See the package docs and the backend source.[^docs][^backend]

Related: [raster](/image-takumi/concepts/raster.md), [fonts](/image-takumi/concepts/fonts.md).

[^docs]: Package docs

[^backend]: Takumi backend
