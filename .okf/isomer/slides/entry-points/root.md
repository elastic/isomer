---
type: Entry Point
title: Root
description: '@elastic/isomer-primitives-slides slidesPack, slideDeckFrame, and primitive types.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/src/index.ts
tags: [isomer, slides, api]
status: stable
stale_after: 2027-03-18
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/src/index.ts
    title: Root barrel
---

# Definition

`slidesPack` and `slideDeckFrame` plus every node type and its item types (`SlideTimelineItem`, `SlidePipelineSpan`, `SlideSplitSide`, `SlideTranscriptTurn`, …), the authoring guide exports, and `resolveSlideRenders`. Host conveniences beside them: `slideJsx`, the prebuilt `buildJsxShim(slideDeckPrimitives)`; `slideFontFaces`, the faces the image surface needs, derived from the theme and mapped to files by the host; `slideStylesheet`, `StandaloneSlideNode`, `slideOverflow`, `slideOverlaps`, and `slideAuthoringNotes`.[^barrel]

Related: [pack](/slides/concepts/pack.md), [public contract](/slides/reference/public-contract.md).

[^barrel]: Root barrel
