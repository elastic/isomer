---
type: Entry Point
title: Root
description: '@elastic/isomer-sdk composition types, define helpers, validation, dispatch, and both JSON Schema projections.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/entries/index.ts
tags: [isomer, sdk, api]
status: stable
stale_after: 2027-03-18
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/entries/index.ts
    title: Root barrel
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/package.json
    title: Package exports
---

# Definition

The default export map. Composition types and errors, `definePrimitive`, `definePrimitivePack`, frames, validation, `buildCompositionJsonSchema`, `buildAuthoringJsonSchema`, `authoringSchemaSubset`, `authoringBodySchema`, dispatch, and `scopeScript` live here; the browser-side `runEnhancementScript`, `findNodeElementPairs`, and `measureDom` are on [`./react`](/sdk/entry-points/react.md). Root consumers load `react`, because the dispatcher owns the React renderer, and the GFM parser and serializer, for authored Markdown and the `md` builder. `react-dom` and `react-dom/server` stay off this entry; [`./html`](/sdk/entry-points/html.md) is what loads the server renderer.[^barrel][^package]

Related: [pipeline](/sdk/concepts/pipeline.md), [html](/sdk/entry-points/html.md), [author](/sdk/entry-points/author.md), [testing](/sdk/entry-points/testing.md).

[^barrel]: Root barrel

[^package]: Package exports
