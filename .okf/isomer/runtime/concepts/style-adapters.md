---
type: Concept
title: Style adapters
description: The HTML surface runs the host adapter if supplied, otherwise the packs' own, combined.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/style_adapter.ts
tags: [isomer, runtime, css]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.6, at: 2026-09-18T22:35:00Z }
sources:
  - id: adapter
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/style_adapter.ts
    title: resolveStyleAdapter
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/packs.md
    title: Runtime packs
---

# Definition

`resolveStyleAdapter` returns the host's adapter if one was passed, otherwise the packs' adapters combined. Construction throws when `styleCollector` tags disagree. A host that wants a CSS-bearing pack on text or Slack only supplies a no-op adapter, which replaces every pack's.[^adapter][^docs]

Related: [pack composition](/runtime/concepts/packs.md), [rendering](/sdk/concepts/rendering.md).

[^adapter]: resolveStyleAdapter

[^docs]: Runtime packs
