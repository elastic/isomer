---
type: Entry Point
title: Author
description: '@elastic/isomer-sdk/author schema brands, JSX shim, and authoring prompt.'
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

`fromChildren`, `fromTextChildren`, and `buildJsxShim` turn a primitive schema into typed JSX. A brand is read through `.optional()`, `.nullable()`, `.default()`, and `.readonly()`, a field is optional when any layer is, and branding one schema instance again with a different configuration throws `AUTHORED_SCHEMA_REUSED`. A child's item schema may brand its own fields, which get components too; a non-array field takes one element, and a second throws `UNEXPECTED_CHILDREN`. `readAuthoredSpec` returns a schema's top-level branded fields for hosts that read or display the JSX form; a child field's `itemSchema` holds its own. `buildAuthoringDeclarations` prints an authoring schema as an ambient `.d.ts` module for an editor, and `authoringBodySchema` returns its `body` as a schema of its own. `buildAuthoringPrompt` assembles a profile's prompt from a pack's guide and rules and what the host supplies. The prompt minifies JSON, lists registered views, and inlines each catalog `example`. `registered-view-router` omits the JSON Schema. Showcase `definition.examples` stay off the prompt. `catalog: 'index'` lists each primitive's type and purpose under its pack's groups, and `formatPrimitiveEntry` prints one full bullet for a lookup. Catalog and registered-view lines collapse each whitespace run holding a line terminator to one space.[^barrel]

Related: [authoring](/sdk/concepts/authoring.md), [authoring context](/runtime/concepts/authoring-context.md).

Editor declarations use a host-selected `moduleName` and share the shim's authoring model. Custom `toItem` children can supply `propsSchema` for input-prop checking. JSX catchalls constrain extra keys; raw node index signatures remain a structural approximation, and body validation uses the JSON Schema.

[^barrel]: Author barrel
