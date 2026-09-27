---
type: Concept
title: Pack
description: Forty slide-deck primitives, six surfaces, one Distillate HTML adapter, copy and builds enhancements, and an authoring guide for agents.
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
  - id: builds
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/builds.md
    title: Builds
---

# Definition

The in-repo reference pack. Frame and openers: `slideFrame` (with `tone: 'inverse'` for title, section, and closing slides), `slideHeading`, `slideStatement`, `slideQuote`, `slideTitle`, `slideSection`, `slideAgenda`, `slideClosing`, and `slideSource` as a slide's last line. Layout: `slideSplit` (with an `aside` ratio and `hairline` divider for a column of notes), `slideStack`, `slideWindow`. Diagrams: `slideFanout`, `slideTimeline`, `slidePipeline`, `slideLanes`, `slideGraph`, `slideSequence`, `slideLayers`, `slideQuadrant`. Lists and numbers: `slideStat`, `slideStats`, `slideDelta`, `slideBars`, `slideMatrix`, `slideColumns`, `slideRoadmap`, `slideDefinitions`, `slideList`, `slideBulletList`, `slideTree`, `slideTable`, `slideTerritoryGroup`. Code and conversation: `slideCode`, `slideDiff`, `slideCommand`, `slideTranscript`. Embedded renders: `slideRender`, `slideAnnotatedRender`, `slideRenderGrid`. Surfaces: React, HTML, text, Markdown, Slack, and SVG, the last only when the runtime is given frames. The pack ships its own Distillate HTML adapter and declares `styleCollector: DISTILLATE_STYLE_COLLECTOR`.[^pack][^docs]

On Slack, every container dispatches its children through `scope.renderSlack`, so `slideTable`'s native `table` renderer is reached under a frame; the other leaves fall back through markdown. The pack declares no `surfaces` because not every primitive has a `slack` renderer.[^contract]

`buildSlidesAuthoringPrompt` assembles the guide (`slidesAuthoringGuide`), rules (`slidesAuthoringRules`), catalog, and authoring JSON Schema an agent writes slides from; `slidesPackAuthoring` restates each cross-field `.refine` as its `$def` description. `resolveSlideRenders` fills a `slideRender` that names another slide by slug, including one inside a `slideAnnotatedRender`.[^docs]

Prose fields accept inline marks, `` `code` `` and `**strong**`, and say so in their schema descriptions: a chip and emphasis on React, HTML, and SVG, unchanged in Markdown, `*bold*` in Slack, and stripped in text. The `slideCopy` enhancement's script adds a Copy button to each `slideCommand` it finds by node anchor, in a render whose host opts in and runs the script, and only when a clipboard exists. No renderer draws the button, so without the script there is none; the command panel styles it by its `data-slide-copy` attribute; the pack wraps its Distillate adapter to resolve enhancements and emit their scripts, which that adapter does not do itself.[^docs]

Every renderer spreads a node anchor on its root. The `slideBuilds` enhancement uses them to reveal an ordered primitive's parts (pipeline steps, sequence messages, list, bullet, timeline, and transcript items) one per click, in reading order. It has no script: a host counts clicks with `slideBuilds`, and applies a step with `showSlideBuild`, which hides later parts with `visibility: hidden`. Embedded slides never build, and only the React and HTML surfaces do.[^builds]

Related: [theme](/slides/concepts/theme.md), [one source](/slides/concepts/one-source.md), [document](/slides/concepts/document.md).

[^pack]: slidesPack

[^docs]: Pack overview

[^contract]: Pack contract

[^builds]: Builds
