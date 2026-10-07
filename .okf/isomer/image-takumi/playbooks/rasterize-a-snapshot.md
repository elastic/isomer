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

1. Install `@elastic/isomer-image-takumi`; it has no React peers, since it reads the snapshot's `html`.
2. Render with `runtime.surfaces.snapshot.render(composition)`.
3. Construct `createTakumiImageBackend({ fonts })` with the faces the pack's theme names, and pass its `formats` to `createIsomerRuntime({ formats })` so `getCapabilities()` reports them.
4. Call `.png(...)`, with `devicePixelRatio` for a sharper raster at the same size, or `.svg(...)`; or `renderPng(runtime, composition, backend)` for the bytes beside the validation findings.[^docs][^backend]

Related: [raster](/image-takumi/concepts/raster.md), [fonts](/image-takumi/concepts/fonts.md).

[^docs]: Package docs

[^backend]: Takumi backend
