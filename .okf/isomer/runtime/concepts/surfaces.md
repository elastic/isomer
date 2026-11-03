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

The runtime exposes six render targets, `react`, `html`, `text`, `markdown`, `slack`, and `snapshot`; `snapshot` needs a frame and is the one that is not a format. See the package doc on surfaces.[^docs]

Related: [runtime](/runtime/concepts/runtime.md), [frame](/runtime/concepts/frame.md).

[^docs]: Surfaces
