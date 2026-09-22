---
type: Concept
title: View registry
description: Product-owned views, registered by id and requested by answers.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/registry/view_registry.ts
tags: [isomer, runtime, registry]
status: stable
stale_after: 2027-03-18
sources:
  - id: registry
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/registry/view_registry.ts
    title: View registry
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/view-registry.md
    title: View registry docs
---

# Definition

Every `IsomerRuntime` owns one view registry, built by `createIsomerRuntime` and exposed as `runtime.viewRegistry`; a host never constructs a registry itself. `defineView({ id, title, answers, input?, build })` publishes one, registered via the `views` option or `runtime.viewRegistry.register`. A host requests a view by id; `RegisteredViewInputError` is identified like other Isomer errors, by `name` and `code`.[^registry][^docs]

Related: [runtime](/runtime/concepts/runtime.md), [authoring context](/runtime/concepts/authoring-context.md).

[^registry]: View registry

[^docs]: View registry docs
