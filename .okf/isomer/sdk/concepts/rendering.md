---
type: Concept
title: Rendering
description: Envelopes for four of the six surfaces, the HTML renderer, and style adapters.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/rendering.md
tags: [isomer, sdk, rendering]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/rendering.md
    title: Rendering
  - id: distillate-adapter
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/render/html/distillate_style_adapter.ts
    title: Distillate HTML style adapter
  - id: envelope
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/render/html/envelope.ts
    title: HTML envelope
---

# Definition

Renderers return envelopes, not bare strings or elements. HTML may run a style adapter and pack `collectStyles` hooks. `createDistillateHtmlStyleAdapter` publishes `DISTILLATE_STYLE_COLLECTOR`; combining adapters is the runtime's job.[^docs][^distillate-adapter]

HTML returns `{ html, css, js, body, measurement, validationErrors }`. Every script it carries is a function body with `root`, the `.isomer` section, in scope, and each part runs in its own function. `scripts: 'embedded'` (the default) puts one `<script>` in `html` that binds `root` to its parent section. It never runs in a shadow root or when the host inserts `html` itself, so those hosts use `scripts: 'host'`: no `<script>`, and the host calls `runEnhancementScript(js, section)`. An embedded script with no root warns; `runEnhancementScript` throws `ENHANCEMENT_ROOT_MISSING` without a section and warns when the section also carries an embedded script. It uses `new Function`, so a strict CSP needs `'unsafe-eval'`.[^docs][^envelope]

URL-bearing fields go through one trust policy. See [URL trust](/sdk/concepts/url-trust.md).

Related: [dispatch](/sdk/concepts/dispatch.md), [packs](/sdk/concepts/packs.md), [style adapters](/runtime/concepts/style-adapters.md).

[^docs]: Rendering

[^distillate-adapter]: Distillate HTML style adapter

[^envelope]: HTML envelope
