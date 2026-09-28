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
  - id: copy
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/copy.md
    title: Copy buttons
  - id: authoring
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/src/pack_authoring.ts
    title: slidesPackAuthoring
  - id: resolve
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/src/resolve_renders.ts
    title: resolveSlideRenders
---

# Definition

The in-repo reference pack: forty primitives in six `slidePrimitiveGroups`. Slide structure: `slideFrame` (with `tone: 'inverse'` for title, section, and closing slides), `slideHeading`, `slideStatement`, `slideQuote`, `slideTitle`, `slideSection`, `slideAgenda`, `slideClosing`, and `slideSource` as a slide's last line. Layout: `slideSplit` (with an `aside` ratio and `hairline` divider for a column of notes), `slideStack`, `slideWindow`. Text: `slideList`, `slideBulletList`, `slideDefinitions`, `slideColumns`, `slideRoadmap`. Diagrams: `slideTimeline`, `slidePipeline`, `slideSequence`, `slideLanes`, `slideGraph`, `slideFanout`, `slideTree`, `slideLayers`, `slideTerritoryGroup`, `slideQuadrant`. Numbers: `slideStat`, `slideStats`, `slideDelta`, `slideBars`, `slideMatrix`, `slideTable`. Code and renders: `slideCode`, `slideDiff`, `slideCommand`, `slideTranscript`, `slideRender`, `slideAnnotatedRender`, `slideRenderGrid`. Surfaces: React, HTML, text, Markdown, Slack, and SVG, the last only when the runtime is given frames. The pack ships its own Distillate HTML adapter and declares `styleCollector: DISTILLATE_STYLE_COLLECTOR`.[^pack][^docs]

On Slack, eight containers (`slideFrame`, `slideSplit`, `slideStack`, `slideWindow`, `slideTitle` for its aside, and `slideRender`, `slideRenderGrid`, and `slideAnnotatedRender` for their embedded composition) render each child through `scope.renderSlack`, so a native renderer below them is reached. Fourteen leaves have native renderers: `slideClosing`, `slideCode`, `slideCommand`, `slideDiff`, `slideFanout`, `slideHeading`, `slideQuote`, `slideSection`, `slideSource`, `slideStat`, `slideStatement`, `slideStats`, `slideTable`, and `slideTranscript`. Every other leaf falls back through its markdown. The pack declares no `surfaces` because not every primitive has a `slack` renderer.[^contract]

`buildSlidesAuthoringPrompt` assembles the guide (`slidesAuthoringGuide`), rules (`slidesAuthoringRules`), catalog, and authoring JSON Schema an agent writes slides from, and `slideAuthoringNotes` holds deck rules validation leaves open. `slidesPackAuthoring` indexes the primitives under `slidePrimitiveGroups` and restates each cross-field rule as its `$def` description, since the JSON Schema drops it: `slideColumns.highlight` is an index into `items`, `slideRenderGrid` renders one composition on two to six surfaces, each once, and `slideDelta.change` needs both values.[^docs][^authoring]

`resolveSlideRenders` fills a `slideRender` that names another slide by slug, including one inside a `slideAnnotatedRender`. A slug that names more than one slide throws, whatever `onUnresolved` says. An embedded render lays out as its slide would alone: the host slide's `crowding` and `logo` do not reach it.[^resolve]

Prose fields accept inline marks, `` `code` `` and `**strong**`, and say so in their schema descriptions: a chip and emphasis on React, HTML, and SVG, kept in Markdown with everything else escaped, `*bold*` in Slack, and stripped in text. The deck root sets `overflow-wrap: anywhere`, so every slide text rule wraps an unbreakable word inside the slide. `slideOverflow` and `slideOverlaps` read a slide's Takumi layout for content past the frame body and for body nodes drawn over each other; both compare only the frame body's own nodes, so a collision inside a container shows only in the image.[^docs]

The `slideCopy` enhancement (`SLIDE_COPY`) adds a Copy button to each `slideCommand` from its script, which finds the command by node anchor, in an HTML render whose host requests it and runs the script, and only when `navigator.clipboard` exists. No renderer draws the button, so without the script there is none; the command panel styles it by its `data-slide-copy` attribute. `src/pack.ts` wraps the Distillate adapter in the pack-local `withEnhancements` with the pack's own enhancement ids, so the adapter resolves them and emits only this pack's enhancement scripts.[^copy][^contract]

Every renderer spreads a node anchor on its root. The `slideBuilds` enhancement uses them to reveal an ordered primitive's parts (pipeline steps, sequence messages, list, bullet, timeline, and transcript items) one per click, in reading order. It has no script: a host counts clicks with `slideBuilds`, and applies a step with `showSlideBuild`, which hides later parts with `visibility: hidden`. Embedded slides never build, and only the React and HTML surfaces do.[^builds]

Related: [theme](/slides/concepts/theme.md), [one source](/slides/concepts/one-source.md), [document](/slides/concepts/document.md).

[^pack]: slidesPack

[^docs]: Pack overview

[^contract]: Pack contract

[^builds]: Builds

[^copy]: Copy buttons

[^authoring]: slidesPackAuthoring

[^resolve]: resolveSlideRenders
