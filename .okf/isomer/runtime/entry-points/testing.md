---
type: Entry Point
title: Testing
description: '@elastic/isomer-runtime/testing: createRuntimeConformanceHarness derives the SDK conformance harness from a runtime.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/testing/index.ts
tags: [isomer, runtime, api, testing]
status: stable
stale_after: 2027-03-18
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/testing/index.ts
    title: Testing barrel
  - id: harness
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/testing/conformance_harness.ts
    title: Conformance harness factory
---

# Definition

One value, `createRuntimeConformanceHarness(runtime, overrides?)`, returning the SDK's `PrimitiveConformanceHarness` for an `IsomerRuntime`. It derives every member the runtime can answer: validation, the `react`, `html`, `text`, `markdown`, and `slack` surfaces with per-node renders collecting validation errors, `anchorWalk` over the runtime's primitives, and a `wrapComposition` titled `CONFORMANCE_FIXTURE_TITLE`. `renderSnapshot` and `renderSnapshotComposition` exist only when the runtime has a frame. `renderHTML` forwards `css` and `anchors` but not `names`. `overrides` replaces derived members and supplies what a runtime cannot know: `nestForeignChild`, `sizesFromNodeHeights`, `estimateSnapshotHeight`, `assertVarRefsHaveDeclarations`, or a frame-wrapping `wrapComposition`. It lives in the runtime because the SDK cannot depend on it, and it reaches Node built-ins through the SDK's `./testing` entry.[^barrel][^harness]

Related: [root](/runtime/entry-points/root.md), [SDK testing](/sdk/entry-points/testing.md).

[^barrel]: Testing barrel

[^harness]: Conformance harness factory
