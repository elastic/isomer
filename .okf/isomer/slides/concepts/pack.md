---
type: Concept
title: Pack
description: Thirty-one slide-deck primitives, six surfaces, one Distillate HTML adapter, and the slideCopy enhancement.
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

The in-repo reference pack. Primitives: `slideFrame`, `slideHeading`, `slideStatement`, `slideQuote`, `slideTitle`, `slideSection`, `slideAgenda`, `slideClosing`, `slideSource`, `slideSplit`, `slideStack`, `slideList`, `slideBulletList`, `slideDefinitions`, `slideFanout`, `slidePipeline`, `slideSequence`, `slideLanes`, `slideLayers`, `slideTerritoryGroup`, `slideStat`, `slideStats`, `slideDelta`, `slideBars`, `slideTable`, `slideMatrix`, `slideQuadrant`, `slideCode`, `slideDiff`, `slideCommand`, `slideTranscript`. Surfaces: React, HTML, text, Markdown, Slack, and SVG, the last only when the runtime is given frames. Every primitive has a native `slack` renderer, and every `markdown` renderer returns `md` builder content. `slideSplit` takes its two panes as `SlideSplitPane` children in JSX, and `slideTranscript` its turns as `SlideTurn` children. The pack's one enhancement, `slideCopyEnhancement` (id `SLIDE_COPY`), adds a Copy button to each `slideCommand` where its script runs. The pack declares `authoring.groups` and exports `buildSlidesAuthoringPrompt`, `slideJsx`, `slidePrimitiveGroups`, and `slideFontFaces`. The pack ships its own Distillate HTML adapter and declares `styleCollector: DISTILLATE_STYLE_COLLECTOR`.[^pack][^docs]

Related: [theme](/slides/concepts/theme.md), [one source](/slides/concepts/one-source.md), [document](/slides/concepts/document.md).

[^pack]: slidesPack

[^docs]: Pack overview
