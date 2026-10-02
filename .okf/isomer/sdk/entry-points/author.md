---
type: Entry Point
title: Author
description: '@elastic/isomer-sdk/author schema brands, JSX shim, and prompt builders.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/author/index.ts
tags: [isomer, sdk, api, author]
status: stable
stale_after: 2027-03-18
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/author/index.ts
    title: Author barrel
---

# Definition

`fromChildren`, `fromTextChildren`, and `buildJsxShim` turn a primitive schema into typed JSX. A brand is read through `.optional()`, `.nullable()`, `.default()`, and `.readonly()`, a field is optional when any layer is, and branding one schema instance again with a different configuration throws `AUTHORED_SCHEMA_REUSED`. Prompt builders bind guide, rules, and defaults; hosts supply what varies. The prompt minifies JSON, lists registered views, and inlines each catalog `example`. `registered-view-router` omits the JSON Schema. Showcase `definition.examples` stay off the prompt. `catalog: 'index'` lists each primitive's type and purpose under its pack's groups, and `formatPrimitiveEntry` prints one full bullet for a lookup. Catalog and registered-view lines collapse each whitespace run holding a line terminator to one space.[^barrel]

Related: [authoring](/sdk/concepts/authoring.md), [authoring context](/runtime/concepts/authoring-context.md).

[^barrel]: Author barrel
