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

`slidesPack` and `slideDeckFrame` plus the eight node types. Child item types such as `SlideSplitPane` and `SlideTerritory` come from the schemas; JSX components come prebuilt as `slideJsx`. The authoring prompt is `buildSlidesAuthoringPrompt`, and the faces an image backend registers are `slideFontFaces`.[^barrel]

Related: [pack](/slides/concepts/pack.md), [public contract](/slides/reference/public-contract.md).

[^barrel]: Root barrel
