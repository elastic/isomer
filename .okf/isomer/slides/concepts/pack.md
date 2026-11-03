---
type: Concept
title: Pack
description: Forty-one slide-deck primitives, six surfaces, one Distillate HTML adapter, and the builds and Copy enhancements.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/src/pack.ts
tags: [isomer, slides]
status: stable
stale_after: 2027-03-18
sources:
  - id: pack
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/src/pack.ts
    title: slidesPack
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/index.md
    title: Pack overview
---

# Definition

The in-repo reference pack: its primitives, surfaces, JSX children, builds, and Copy enhancement. See the package overview and the pages it links.[^docs]

`slideGraph` derives its arrows (`graphEdges`): the main row joins left to right, and an above or below node names the main-row node it joins in `of`, its arrow pointing into the row unless `direction: 'out'`. Whole-slide layouts end in `Slide`. The pack registers two enhancements: `slideBuildsEnhancement`, which turns on anchors so a host can reveal an ordered primitive one part per click with `showSlideBuild`: a `slideBulletList` item, a `slideList` row, a `slidePipeline` step, a `slideSequence` message, a `slideTimeline` item, or a `slideTranscript` turn, and `slideCopyEnhancement` (id `SLIDE_COPY`), which adds a Copy button to each `slideCommand` where its script runs. The pack declares `authoring.groups` and exports `buildSlidesAuthoringPrompt`, `slideJsx`, `slidePrimitiveGroups`, and `slideFontFaces`. The pack ships its own Distillate HTML adapter, `createDistillateStyleAdapter`, whose `styleCollector` tag is `DISTILLATE_STYLE_COLLECTOR`.[^pack]

Related: [theme](/slides/concepts/theme.md), [one source](/slides/concepts/one-source.md), [document](/slides/concepts/document.md).

[^pack]: slidesPack

[^docs]: Pack overview
