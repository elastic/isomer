---
type: Entry Point
title: Root
description: '@elastic/isomer-runtime: createIsomerRuntime, defineView, the SDK error classes, and every option and result type.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/index.ts
tags: [isomer, runtime, api]
status: stable
stale_after: 2027-03-18
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/index.ts
    title: Root barrel
---

# Definition

One entry point exporting `createIsomerRuntime`, `defineView`, the error classes, and every option and result type. See the [API reference](https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/api.md).

The surface factories and `createViewRegistry` stay internal: a runtime builds them.[^barrel]

Related: [runtime](/runtime/concepts/runtime.md), [public contract](/runtime/reference/public-contract.md).

[^barrel]: Root barrel
