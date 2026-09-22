---
type: Concept
title: Determinism
description: At a pinned @takumi-rs/core and a fixed font set, the same input produces identical PNG bytes.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/docs/index.md
tags: [isomer, image-takumi, determinism]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/docs/index.md
    title: Package docs
  - id: examples
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/src/examples/deck/output
    title: Committed PNG artifacts
---

# Definition

The raster is byte-stable across darwin-arm64 and linux-x64 at a pinned `@takumi-rs/core` and a fixed font set. Committed PNGs under the slides examples are compared byte-for-byte rather than by pixel tolerance.[^docs][^examples]

Related: [raster](/image-takumi/concepts/raster.md), [slides pack](/slides/concepts/pack.md).

[^docs]: Package docs

[^examples]: Committed PNG artifacts
