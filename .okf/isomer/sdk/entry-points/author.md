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

`fromChildren`, `fromTextChildren`, `fromNodeChildren`, and `buildJsxShim` turn a primitive schema into typed JSX; `fromNodeChildren` fills an unwalked node field from the primitive elements no other field claims, and `fromTextChildren(schema, { dedent: true })` reads text children as dedented source. A brand is read through `.optional()`, `.nullable()`, `.default()`, and `.readonly()`, a field is optional when any layer is, and branding one schema instance again with a different configuration throws `AUTHORED_SCHEMA_REUSED`. A child's item schema may brand its own fields, which get components too; a non-array field takes one element, and a second throws `UNEXPECTED_CHILDREN`. Several branded fields share one children list: each takes the elements of its child type, and elements that match none of them fill the one child slot that is not branded. A primitive with no brand still fills that one slot from its children, and the field is optional on the component's props. An element that matches neither throws `UNEXPECTED_CHILDREN`, or `AUTHOR_TYPE_MISMATCH` when one branded field is still empty. `readAuthoredSpec` returns a schema's top-level branded fields for hosts that read or display the JSX form; a child field's `itemSchema` holds its own. `buildAuthoringDeclarations` prints an authoring schema as an ambient `.d.ts` module for an editor, and `authoringBodySchema` returns its `body` as a schema of its own. `buildAuthoringPrompt` assembles a profile's prompt from a pack's guide and rules and what the host supplies. The prompt minifies JSON, lists registered views, and inlines each catalog `example`. `registered-view-router` omits the JSON Schema. Showcase `definition.examples` stay off the prompt. `catalog: 'index'` lists each primitive's type and purpose under its pack's groups, and `formatPrimitiveEntry` prints one full bullet for a lookup. Catalog and registered-view lines collapse each whitespace run holding a line terminator to one space.[^barrel]

Related: [authoring](/sdk/concepts/authoring.md), [authoring context](/runtime/concepts/authoring-context.md).

Editor declarations use a host-selected `moduleName` and share the shim's authoring model. Custom `toItem` children can supply `propsSchema` for input-prop checking; shared child names reject incompatible input schemas without executing default or fallback callbacks. Automatic JSX supports production and development runtime declarations. JSX catchalls constrain extra keys; raw node index signatures remain a structural approximation, and body validation uses the JSON Schema.

[^barrel]: Author barrel
