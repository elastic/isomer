---
type: Concept
title: Frame
description: The document a snapshot is drawn inside. Exclusive, one per render, supplied by the host; decides whether snapshot exists.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/frame.md
tags: [isomer, runtime, frame]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/frame.md
    title: Frame
  - id: runtime
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/runtime.ts
    title: Frame map and default resolution
  - id: snapshot
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/surfaces/snapshot.ts
    title: snapshot surface
---

# Definition

A frame is the document a `snapshot` render is drawn inside: exclusive, one per render, supplied by the host, and deciding whether `surfaces.snapshot` exists. See the package doc on frames.[^docs]

Related: [surfaces](/runtime/concepts/surfaces.md), [runtime](/runtime/concepts/runtime.md), [slide document](/slides/concepts/document.md).

[^docs]: Frame
