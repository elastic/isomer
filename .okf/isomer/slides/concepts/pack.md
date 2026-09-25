---
type: Concept
title: Pack
description: Twenty-six slide-deck primitives, six surfaces, one Distillate HTML adapter, and an authoring guide for agents.
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
  - id: contract
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/contract.md
    title: Pack contract
---

# Definition

The in-repo reference pack. Frame and openers: `slideFrame` (with `tone: 'inverse'` for title, section, and closing slides), `slideHeading`, `slideTitle`, `slideSection`, `slideClosing`. Layout: `slideSplit`, `slideStack`, `slideWindow`. Diagrams: `slideFanout`, `slideTimeline`, `slidePipeline`, `slideLanes`, `slideGraph`. Lists and numbers: `slideStat`, `slideStats`, `slideColumns`, `slideDefinitions`, `slideList`, `slideBulletList`, `slideTree`, `slideTable`, `slideTerritoryGroup`. Code and conversation: `slideCode`, `slideTranscript`. Embedded renders: `slideRender`, `slideRenderGrid`. Surfaces: React, HTML, text, Markdown, Slack, and SVG, the last only when the runtime is given frames. The pack ships its own Distillate HTML adapter and declares `styleCollector: DISTILLATE_STYLE_COLLECTOR`.[^pack][^docs]

On Slack, every container dispatches its children through `scope.renderSlack`, so `slideTable`'s native `table` renderer is reached under a frame; the other leaves fall back through markdown. The pack declares no `surfaces` because not every primitive has a `slack` renderer.[^contract]

`buildSlidesAuthoringPrompt` assembles the guide (`slidesAuthoringGuide`), rules (`slidesAuthoringRules`), catalog, and authoring JSON Schema an agent writes slides from; `slidesPackAuthoring` restates each cross-field `.refine` as its `$def` description. `resolveSlideRenders` fills a `slideRender` that names another slide by slug.[^docs]

Related: [theme](/slides/concepts/theme.md), [one source](/slides/concepts/one-source.md), [document](/slides/concepts/document.md).

[^pack]: slidesPack

[^docs]: Pack overview

[^contract]: Pack contract
