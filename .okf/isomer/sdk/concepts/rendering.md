---
type: Concept
title: Rendering
description: Envelopes for four of the six surfaces, the HTML renderer, and style adapters.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/rendering.md
tags: [isomer, sdk, rendering]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.6, at: 2026-09-18T22:35:00Z }
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/rendering.md
    title: Rendering
  - id: distillate-adapter
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/render/html/distillate_style_adapter.ts
    title: Distillate HTML style adapter
---

# Definition

Renderers return envelopes, not bare strings or elements. HTML may run a style adapter and pack `collectStyles` hooks. `createDistillateHtmlStyleAdapter` publishes `DISTILLATE_STYLE_COLLECTOR`; combining adapters is the runtime's job.[^docs][^distillate-adapter]

URL-bearing fields go through one trust policy. See [URL trust](/sdk/concepts/url-trust.md).

Related: [dispatch](/sdk/concepts/dispatch.md), [packs](/sdk/concepts/packs.md), [style adapters](/runtime/concepts/style-adapters.md).

[^docs]: Rendering

[^distillate-adapter]: Distillate HTML style adapter
