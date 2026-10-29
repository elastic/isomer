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

The default export map: composition types and errors, define helpers, frames, validation, both JSON Schema projections, and dispatch; it loads `react` and the GFM parser but not `react-dom`.[^barrel][^package] See the [API reference](https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/api.md#root-entry--contracts).

Related: [pipeline](/sdk/concepts/pipeline.md), [html](/sdk/entry-points/html.md), [author](/sdk/entry-points/author.md), [testing](/sdk/entry-points/testing.md).

[^barrel]: Root barrel

[^package]: Package exports
