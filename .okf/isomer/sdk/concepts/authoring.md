---
type: Concept
title: Authoring
description: JSX, object builders, and agent prompt assembly. Structural context comes from the runtime.
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

`buildJsxShim` takes a registry tuple and derives container components, child components, and `toComposition` from each primitive's schema. `fromChildren` and `fromTextChildren` brand the field JSX children fill; `z.infer` is unchanged. A `schemaFor` primitive hand-writes its node type and passes `toItem` when the child record holds the body-node union. Every other primitive's schema is its only declaration. `toComposition` converts author elements found anywhere inside a prop's plain objects and arrays.[^docs][^author]

A shim's `toJsx` prints a composition back to JSX that `toComposition` parses to the same value, as JSON sees it. A node prints as an element wherever its owner's walker reports a child, nested fields included; anything else, such as an embedded composition in a `slideRender`, prints as an object literal. A string holding `&`, a line terminator, a brace, or a lone surrogate prints as an escaped expression rather than an attribute string, and a key JSX cannot name goes through a spread. Both directions throw `INVALID_BODY_NODE` past 256 levels of nesting, which also stops a cycle, and `toJsx` throws it and for what JSX cannot carry: a body entry that is not a registered node, a `__proto__`, `children`, `key`, or `ref` prop, or a type or `root` that is not a component name.[^docs][^author]

Packs bind a guide, rules, and defaults with `createAuthoringPromptBuilder` and `createAgentAuthoringContextFactory`. The factory's defaults also take `catalog`, `groups`, `heading`, and `intro`, and it returns an `AgentAuthoringContext` whose `schema` is always present; a builder context that sets `schema: undefined` drops the pack's schema. The structural half — authoring schema, catalog, views — comes from the runtime's [authoring context](/runtime/concepts/authoring-context.md). The prose half belongs to the pack. The prompt minifies JSON, inlines each catalog `example`, and lists registered views. `general` and `compose-from-primitives` inline the schema; `registered-view-router` does not. Host `examples` are capped at one and have `meta` stripped. Showcase `definition.examples` stay off the prompt; the conformance harness still reads them. `catalog: 'index'` lists each primitive's type and purpose under its pack's `groups` rather than full entries, for a host that answers lookups with the runtime's `describePrimitives`; `formatPrimitiveEntry` prints one full entry.

`oneLine` replaces every line terminator with a space, `jsonLine` is `JSON.stringify` with U+2028 and U+2029 escaped, and `quoteInput` is `jsonLine` of a string cut to 100 characters, for text a host adds to a prompt or echoes in a message.[^docs]

Related: [primitives](/sdk/concepts/primitives.md), [entry point author](/sdk/entry-points/author.md).

[^docs]: Authoring

[^author]: author stage
