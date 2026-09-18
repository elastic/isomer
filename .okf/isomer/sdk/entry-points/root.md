---
type: Entry Point
title: Root
description: '@elastic/isomer-sdk composition types, define helpers, validation, dispatch, and both JSON Schema projections.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/entries/index.ts
tags: [isomer, sdk, api]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.7, at: 2026-09-22T00:50:00Z }
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/entries/index.ts
    title: Root barrel
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/package.json
    title: Package exports
---

# Definition

The default export map. Composition types and errors, `definePrimitive`, `definePrimitivePack`, `themeBound`, frames, validation, `buildCompositionJsonSchema`, `buildAuthoringJsonSchema`, and dispatch live here. Root consumers load `react` because the dispatcher owns the React renderer. `react-dom` and `react-dom/server` stay off this entry; [`./html`](/sdk/entry-points/html.md) is what loads the server renderer.[^barrel][^package]

Related: [pipeline](/sdk/concepts/pipeline.md), [html](/sdk/entry-points/html.md), [author](/sdk/entry-points/author.md), [testing](/sdk/entry-points/testing.md).

[^barrel]: Root barrel

[^package]: Package exports
