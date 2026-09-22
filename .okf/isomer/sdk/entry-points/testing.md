---
type: Entry Point
title: Testing
description: '@elastic/isomer-sdk/testing conformance helpers and assertPackRegistrationComplete.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/testing/index.ts
tags: [isomer, sdk, api, testing]
status: stable
stale_after: 2027-03-18
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/testing/index.ts
    title: Testing barrel
  - id: registration
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/testing/registration.ts
    title: Pack registration check
---

# Definition

Test helpers for packs and renderers. May import any pipeline stage. Node-only: `assertPackRegistrationComplete` reads a primitives directory and fails when a subdirectory is absent from the registry. The body-node union stays hand-written; a type assertion in the pack's tests is what relates the two lists.[^barrel][^registration]

Related: [packs](/sdk/concepts/packs.md), [pipeline](/sdk/concepts/pipeline.md), [root](/sdk/entry-points/root.md).

[^barrel]: Testing barrel

[^registration]: Pack registration check
