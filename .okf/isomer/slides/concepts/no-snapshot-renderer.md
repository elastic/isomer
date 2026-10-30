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

There is no per-primitive `snapshot` renderer: the `snapshot` surface dispatches to `react`, and a shape inside an inline `<svg>` carries literal paint. See the package doc on authoring a primitive and the agent instructions.[^docs][^agents]

Related: [surfaces](/runtime/concepts/surfaces.md), [raster](/image-takumi/concepts/raster.md).

[^agents]: Agent instructions

[^docs]: Authoring a primitive
