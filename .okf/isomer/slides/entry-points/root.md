---
type: Entry Point
title: Root
description: '@elastic/isomer-primitives-slides slidesPack, slideDeckFrame, primitive types, and the host conveniences beside them.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/src/index.ts
tags: [isomer, slides, api]
status: stable
stale_after: 2027-03-18
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/src/index.ts
    title: Root barrel
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/index.md
    title: Pack overview
---

# Definition

What a runtime needs: `slidesPack`, `slideDeckFrame` with `SLIDE_WIDTH` and `SLIDE_HEIGHT`, `slideDeckPrimitives` and `slidePrimitiveTypes`, and the node types (`SlideFrameNode`, `SlideContentNode`, one per primitive, and their item types such as `SlideTimelineItem` and `SlideSplitSide`), with `SlidePackTypes`, `SlideRenderContext`, and `SlideRenderScope`. Theme values: `slideThemes`, `slidePaletteForMode`, `SlideFrameTheme`, `SlidePalette`, and the enum arrays and their types (`slideTones`, `slideFrameTones`, `slideRenderSurfaces`, `slideSplitRatios`, `slideSplitDividers`, `slideStackSpacings`, `slideBulletMarkers`, `slideTranscriptFormats`, `slideTranscriptRoles`, `slideWindowChromes`).[^barrel]

Host conveniences the runtime does not need: `slideJsx`, the prebuilt `buildJsxShim(slideDeckPrimitives)`; `slideFontFaces` (`SlideFontFace`), the faces the image surface needs, derived from the theme and mapped to files by the host; `resolveSlideRenders` (`NamedSlide`, `ResolveSlideRendersOptions`); `SLIDE_BUILDS`, `slideBuilds`, `showSlideBuild`, `slideBuildParts`, and `SlideBuildParts` for builds; `SLIDE_COPY` for copy buttons; `slideStylesheet`, `StandaloneSlideNode`, and `SlideFrameView` for a host that mounts the React tree itself; `slideOverflow`, `slideOverlaps`, `SlideLayoutBox`, `SlideOverflow`, and `SlideOverlap` for fit checks; and `buildSlidesAuthoringPrompt`, `slidesAuthoringGuide`, `slidesAuthoringRules`, `slideAuthoringNotes`, and `slidePrimitiveGroups` for a host that prompts a model.[^barrel][^docs]

Related: [pack](/slides/concepts/pack.md), [public contract](/slides/reference/public-contract.md).

[^barrel]: Root barrel

[^docs]: Pack overview
