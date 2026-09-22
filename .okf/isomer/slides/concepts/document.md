---
type: Concept
title: Document
description: slideDeckFrame is the 16:9 document. The host chooses the frame name.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/document.md
tags: [isomer, slides, frame]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/document.md
    title: Document
---

# Definition

`slideDeckFrame` is the 16:9 document: topbar, body, footer. `slide` is the host's chosen name for it, not a field the pack fixes. A render that wants this document asks for `{ frame: 'slide' }`.[^docs]

Related: [runtime frame](/runtime/concepts/frame.md), [pack](/slides/concepts/pack.md).

[^docs]: Document
