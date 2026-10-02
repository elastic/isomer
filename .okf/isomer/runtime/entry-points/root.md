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

One entry point. Values: `createIsomerRuntime`, `defineView`, and `RegisteredViewInputError`, plus `IsomerError`, `CompositionValidationError`, and `ISOMER_ERROR_CODES` passed through from the SDK, so a host names a thrown error's `code` without a second import. Types: the runtime's options and result (`IsomerRuntimeOptions`, `IsomerRuntime`, `CreateIsomerRuntime`, `RuntimeSurfaces`, `FrameMap`, `RuntimeRendererOverrides`), the authoring context (`RuntimeAuthoringContext`, `PrimitiveDescriptions`, `HostCapabilities`), the view registry's types, `IsomerErrorCode`, and every surface's interface, option, and result type, `SvgPagesResult` included. The surface factories and `createViewRegistry` stay internal: a runtime builds them. `src/api_reference.test.ts` fails when the API page misses an export.[^barrel]

Related: [runtime](/runtime/concepts/runtime.md), [public contract](/runtime/reference/public-contract.md).

[^barrel]: Root barrel
