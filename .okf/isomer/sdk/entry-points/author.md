---
type: Entry Point
title: Author
description: '@elastic/isomer-sdk/author schema brands, JSX shim, and prompt builders.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/author/index.ts
tags: [isomer, sdk, api, author]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.7, at: 2026-09-22T16:30:00Z }
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/author/index.ts
    title: Author barrel
---

# Definition

`fromChildren`, `fromTextChildren`, and `buildJsxShim` turn a primitive schema into typed JSX. Prompt builders bind guide, rules, and defaults; hosts supply what varies. The prompt minifies JSON, lists registered views, and inlines each catalog `example`. `registered-view-router` omits the JSON Schema. Showcase `definition.examples` stay off the prompt.[^barrel]

Related: [authoring](/sdk/concepts/authoring.md), [authoring context](/runtime/concepts/authoring-context.md).

[^barrel]: Author barrel
