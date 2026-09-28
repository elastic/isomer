---
type: Concept
title: Style adapters
description: The HTML surface runs the host adapter if supplied, otherwise the packs' own, combined.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/style_adapter.ts
tags: [isomer, runtime, css]
status: stable
stale_after: 2027-03-18
sources:
  - id: adapter
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/style_adapter.ts
    title: resolveStyleAdapter
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/packs.md
    title: Runtime packs
---

# Definition

`resolveStyleAdapter` returns the host's adapter if one was passed, otherwise the packs' adapters combined. Construction throws when `styleCollector` tags disagree. A host that wants a CSS-bearing pack on text or Slack only supplies a no-op adapter, which replaces every pack's. The combined adapter's render context is a view over each pack's context, not a copy: a key reads from the last pack that has it, with methods bound to their own context, so a class-instance context keeps its private state.[^adapter][^docs]

The combined adapter's render context is a view over every pack's context, not a spread: a key reads from the last context that has it, and a method stays bound to its own context, so a class-instance context keeps its prototype and private state. Hosts and renderers pass `context` along as it is for the same reason, and a host that adds fields does so in its adapter's `createRenderContext` or through a view such as a `Proxy`.[^adapter]

Related: [pack composition](/runtime/concepts/packs.md), [rendering](/sdk/concepts/rendering.md).

[^adapter]: resolveStyleAdapter

[^docs]: Runtime packs
