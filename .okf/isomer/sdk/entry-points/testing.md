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
  - id: icon
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/testing/icon.ts
    title: Pack icon check
---

# Definition

Node-only test helpers for packs and renderers: the conformance harness, `runPrimitiveInventoryConformance`, `assertPackRegistrationComplete`, and `assertPackIconsValid`. See [`./testing`](https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/api.md#testing) in the API reference.

`assertPackIconsValid` checks every entry of a pack's `icons`, or its definitions' icons when the map is absent, with a dependency-free tokenizer that must consume the whole string and separates only on HTML whitespace, and throws one error listing each `<type> icon:` problem; it imports nothing from Node.[^icon]

Related: [packs](/sdk/concepts/packs.md), [pipeline](/sdk/concepts/pipeline.md), [root](/sdk/entry-points/root.md).

[^icon]: Pack icon check
