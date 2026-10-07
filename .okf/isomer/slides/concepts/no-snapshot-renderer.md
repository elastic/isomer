---
type: Concept
title: No snapshot renderer
description: The `snapshot` surface dispatches to react. Inline svg needs literal fill and stroke.
resource: https://github.com/elastic/isomer/blob/main/AGENTS.md
tags: [isomer, slides, snapshot]
status: stable
stale_after: 2027-03-18
sources:
  - id: agents
    resource: https://github.com/elastic/isomer/blob/main/AGENTS.md
    title: Agent instructions
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/primitives.md
    title: Authoring a primitive
---

# Definition

There is no per-primitive `snapshot` renderer. The `snapshot` surface dispatches to `react` and is handed the pack's stylesheet. Do not reintroduce a second tree authored for image layout.

The pack stylesheet does not reach inside an inline `<svg>`. Anything drawn there needs a literal `fill` / `stroke` alongside its class.[^agents][^docs]

Related: [surfaces](/runtime/concepts/surfaces.md), [raster](/image-takumi/concepts/raster.md).

[^agents]: Agent instructions

[^docs]: Authoring a primitive
