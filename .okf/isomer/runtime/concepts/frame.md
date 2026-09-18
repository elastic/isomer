---
type: Concept
title: Frame
description: The document an image is drawn as. Exclusive, one per render, supplied by the host.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/frame.md
tags: [isomer, runtime, frame]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.6, at: 2026-09-18T22:35:00Z }
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/frame.md
    title: Frame
---

# Definition

A frame is the document an `svg` render is drawn inside. Vocabulary and document are independent: packs are additive, frames are exclusive. The host names the frame (`slide`, `card`) when constructing the runtime. A render that wants this document asks for `{ frame: 'slide' }`.[^docs]

Related: [surfaces](/runtime/concepts/surfaces.md), [runtime](/runtime/concepts/runtime.md), [slide document](/slides/concepts/document.md).

[^docs]: Frame
