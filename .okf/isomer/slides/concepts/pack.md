---
type: Concept
title: Pack
description: Forty slide-deck primitives, six surfaces, one Distillate HTML adapter, and the builds and Copy enhancements.
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

The in-repo reference pack. Primitives: `agendaSlide`, `closingSlide`, `quoteSlide`, `sectionSlide`, `slideAnnotatedRender`, `slideBars`, `slideBulletList`, `slideCode`, `slideColumns`, `slideCommand`, `slideDefinitions`, `slideDelta`, `slideDiff`, `slideFanout`, `slideFrame`, `slideGraph`, `slideHeading`, `slideLanes`, `slideLayers`, `slideList`, `slideMatrix`, `slidePipeline`, `slideQuadrant`, `slideRender`, `slideRenderGrid`, `slideRoadmap`, `slideSequence`, `slideSource`, `slideSplitLayout`, `slideStackLayout`, `slideStat`, `slideStats`, `slideTable`, `slideTerritoryGroup`, `slideTimeline`, `slideTranscript`, `slideTree`, `slideWindowLayout`, `statementSlide`, `titleSlide`. Surfaces: React, HTML, text, Markdown, Slack, and SVG, the last only when the runtime is given frames. Every primitive has a native `slack` renderer, and every `markdown` renderer returns `md` builder content. `slideSplitLayout` takes its two panes as `SplitPane` children in JSX, and each pane's primitives are that pane's children. `slideStackLayout` and `slideWindowLayout` take primitives as children. `slideColumns` takes `Column` children, and `slideTranscript` takes `TranscriptTurn` children. `slideCommand`'s command is its text, `slideCode` takes `CodePanel` children whose text, often a template literal, is their `lines`, and `slideDiff` takes one `DiffLine` per line, kept exactly as written. `slideStat` and `slideDelta` take their sentence as text, `slideStats` takes `Stat` children, and `slideBars` takes `Bar` children labelled by their text. `slideTable`, `slideMatrix`, and `slideQuadrant` keep their grids as props. A diagram's parts are children of their kind: `FanoutTarget`, `GraphNode`, `Lane` and `LanesNote`, `Layer`, `PipelineStep` and `PipelineSpan`, `SequenceActor` and `SequenceMessage`, `Territory`, `TimelineItem`, and `TreeEntry`; ids, edges, and chips stay attributes. `slideAnnotatedRender` takes its `SlideRender` and `RenderPin` children side by side, and `slideRenderGrid` takes `RenderTile` children. A content primitive's list is children named for it without the `Slide` prefix, each child's sentence its text: `slideBulletList` takes `BulletItem`, `slideDefinitions` `Definition`, `slideList` `ListItem`, and `slideRoadmap` `RoadmapColumn` holding `RoadmapItem`. `slideHeading`'s title is its text. Whole-slide layouts end in `Slide`. Containers that arrange primitives inside a slide end in `Layout`. In JSX, `agendaSlide` takes `AgendaSection` children, `closingSlide` takes `ClosingLink` and `ClosingPath`, `sectionSlide` takes `SectionItem` children in `slides` (each `{ text, href? }`), `quoteSlide`, `statementSlide`, and `slideSource` take their text as children, and `titleSlide` takes `TitleDefinition` and `TitleAside`. `slideFrame`'s `footer` is a `SlideFooter` child; its other element children fill `body`. Nested nodes are always children, a collection of records brands a child component, a primitive's one authored text is its text children, and scalars and enums stay props; `slideTable`, `slideMatrix`, and `slideQuadrant` keep their grids as props. A render's `body` is the slide it embeds, validated by `schemaFor` but not a walked child, so its ids are its own and it renders no node anchors; in JSX it is the render's or grid's other primitive children, through `fromNodeChildren`. The pack registers two enhancements: `slideBuildsEnhancement`, which turns on anchors so a host can reveal an ordered primitive one part per click with `showSlideBuild`: a `slideBulletList` item, a `slideList` row, a `slidePipeline` step, a `slideSequence` message, a `slideTimeline` item, or a `slideTranscript` turn, and `slideCopyEnhancement` (id `SLIDE_COPY`), which adds a Copy button to each `slideCommand` where its script runs. The pack declares `authoring.groups` and exports `buildSlidesAuthoringPrompt`, `slideJsx`, `slidePrimitiveGroups`, and `slideFontFaces`. The pack ships its own Distillate HTML adapter, `createDistillateStyleAdapter`, whose `styleCollector` tag is `DISTILLATE_STYLE_COLLECTOR`.[^pack][^docs]

Related: [theme](/slides/concepts/theme.md), [one source](/slides/concepts/one-source.md), [document](/slides/concepts/document.md).

[^pack]: slidesPack

[^docs]: Pack overview
