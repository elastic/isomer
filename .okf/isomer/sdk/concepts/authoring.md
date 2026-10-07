---
type: Concept
title: Authoring
description: JSX and agent prompt assembly. Structural context comes from the runtime.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/authoring.md
tags: [isomer, sdk, authoring]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/authoring.md
    title: Authoring
  - id: author
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/author
    title: author stage
---

# Definition

`buildJsxShim` takes a registry tuple and derives container components, child components, and `toComposition` from each primitive's schema; `toComposition` keeps the root element's `version`, `title`, `subtitle`, `theme`, and `meta`. It throws `DUPLICATE_PRIMITIVE_TYPE` when two types, or a type and the root `Composition`, capitalize to one component name, and `UNEXPECTED_CHILDREN` when a primitive with no branded field and no child slot is given children. `fromChildren` and `fromTextChildren` brand the field JSX children fill; `z.infer` is unchanged. A `schemaFor` primitive hand-writes its node type and passes `toItem` when the child record holds the body-node union. Every other primitive's schema is its only declaration.[^docs][^author]

A pack binds its own guide and rules over `buildAuthoringPrompt`. The structural half — authoring schema, catalog, views — comes from the runtime's [authoring context](/runtime/concepts/authoring-context.md). The prose half belongs to the pack. The prompt minifies JSON, inlines each catalog `example`, and lists registered views. `general` and `compose-from-primitives` inline the schema; `registered-view-router` does not. Host `examples` are capped at one and have `meta` stripped. Showcase `definition.examples` stay off the prompt; the conformance harness still reads them. `catalog: 'index'` lists one line per primitive under the pack's `groups`, with the rest under "Other", and `schema` may be left out; `formatPrimitiveEntry` prints one full catalog bullet for a host answering a lookup. `authoringSchemaSubset` cuts the `$defs` some types reach from an authoring schema, keeping its ids and stubbing the body-node union. `authoringBodySchema` returns an authoring schema's `body` with the `$defs` it reaches, and `buildAuthoringDeclarations` prints the schema as an ambient `.d.ts` module for an editor, with each primitive's catalog text as JSDoc and, with `jsx`, the components `buildJsxShim` builds.

Related: [primitives](/sdk/concepts/primitives.md), [entry point author](/sdk/entry-points/author.md).

Editor declarations use a host-selected `moduleName` and share the shim's authoring model. Custom `toItem` children can supply `propsSchema` for input-prop checking. JSX catchalls constrain extra keys; raw node index signatures remain a structural approximation, and body validation uses the JSON Schema.

[^docs]: Authoring

[^author]: author stage
