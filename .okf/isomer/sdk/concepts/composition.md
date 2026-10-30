---
type: Concept
title: Composition
description: The typed JSON document Isomer validates and renders. Discriminator stays type view.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/composition
tags: [isomer, sdk, composition]
status: stable
stale_after: 2027-03-18
sources:
  - id: spec
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/composition.md
    title: Spec and validation
  - id: composition
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/composition
    title: Composition stage
---

# Definition

A `Composition` is the typed JSON document (`type: 'view'`) that Isomer validates and renders, with a trusted validator, an untrusted parser, an input budget, and JSON Schema projections. See the package doc on spec and validation.[^spec]

`mapCompositionNodes(composition, walk, fn)` takes a `ChildNodeWalker` covering every pack represented in the composition, walks without recursion, and throws `CYCLIC_COMPOSITION` for a node nested in itself.[^composition]

Related: [primitives](/sdk/concepts/primitives.md), [dispatch](/sdk/concepts/dispatch.md), [pipeline](/sdk/concepts/pipeline.md).

[^spec]: Spec and validation

[^composition]: Composition stage
