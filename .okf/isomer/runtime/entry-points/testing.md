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

One value, `createRuntimeConformanceHarness(runtime, overrides?)`, returning the SDK's `PrimitiveConformanceHarness` for an `IsomerRuntime`. See the [API reference](https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/api.md#testing).

It lives in the runtime because the SDK cannot depend on it, and it reaches Node built-ins through the SDK's `./testing` entry.[^harness]

Related: [root](/runtime/entry-points/root.md), [SDK testing](/sdk/entry-points/testing.md).

[^harness]: Conformance harness factory
