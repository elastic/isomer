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

`slidesPack` and `slideDeckFrame` plus the twenty node types. Child item types such as `SlideSplitPane`, `SlideTerritory`, `SlideDiffLine`, and `SlideTranscriptTurn` come from the schemas; JSX components come prebuilt as `slideJsx`. The authoring prompt is `buildSlidesAuthoringPrompt`, the faces an image backend registers are `slideFontFaces`, and `SLIDE_COPY` with `slideCopyEnhancement` requests Copy buttons on commands.[^barrel]

Related: [pack](/slides/concepts/pack.md), [public contract](/slides/reference/public-contract.md).

[^barrel]: Root barrel
