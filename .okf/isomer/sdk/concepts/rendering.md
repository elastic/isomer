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
  - id: anchors
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/render/anchors.ts
    title: Node anchors
---

# Definition

Renderers return envelopes, not bare strings or elements. HTML may run a style adapter and pack `collectStyles` hooks. `createDistillateHtmlStyleAdapter` publishes `DISTILLATE_STYLE_COLLECTOR`; combining adapters is the runtime's job.[^docs][^distillate-adapter]

`createHTMLStyleCollection` (on `./html`) returns `{ context, wrapper, heading, css() }`: a host that renders React itself passes `context`, `wrapper`, and `heading` to that render, and `css()` read afterwards is the CSS `renderHTMLWithDispatcher` would emit for it, computed once, so the composition renders once. When anchors are asked for, `context` is a view of the adapter's context with `anchors: true`, not a copy.[^docs]

HTML returns `{ html, css, js, body, measurement, validationErrors }`. Every script it carries is a function body with `root`, the `.isomer` section, in scope, and each part runs in its own function. `scripts: 'embedded'` (the default) puts one `<script>` in `html` that binds `root` to its parent section. It never runs in a shadow root or when the host inserts `html` itself, so those hosts use `scripts: 'host'`: no `<script>`, and the host calls `runEnhancementScript(js, section)`. An embedded script with no root warns; `runEnhancementScript` throws `ENHANCEMENT_ROOT_MISSING` without a section and warns when the section also carries an embedded script. It uses `new Function`, so a strict CSP needs `'unsafe-eval'`. The render resolves `enhancements` once against every pack's definitions: each renderer's context carries the resolved set as `context.enhancements`, through a view of the adapter's context, and `js` carries each resolved enhancement's script once, after the caller's and the adapter's.[^docs][^envelope]

Node anchors let runtime code find a node's element. A `react` renderer spreads `nodeAnchor(context, node)` on its root, which sets `data-isomer-node` to the node's escaped type (`anchorValue`). During an HTML render the surface decides whether anchors render, holding the decision in a render-scoped slot rather than writing to the adapter's context: on when a resolved enhancement declares `anchors: true` or a test passes `anchors: true`. Outside one, on the React and `svg` surfaces, `context.anchors` decides. `withoutAnchors(context)` returns a view of the context, not a copy, that turns anchors off for content that is not a node's `children`. `findNodeElements` pairs nodes and elements by type and order, and `findNodeElementPairs` lists the same pairing per occurrence, so a node object used twice pairs twice. An enhancement the host drives has no `script`.[^docs][^anchors]

`renderTextEnvelope`, `renderMarkdownEnvelope`, and `renderSlackEnvelope` take `heading` (default `true`); `false` leaves out the title and subtitle, and in Slack the fallback `text` built from them, for a host that shows the title itself or a body that opens with its own. The Slack envelope clamps every text a node's renderer returns to its limit in `SLACK_LIMITS` (150 characters for a header, 3,000 for a section, 2,000 for a field, context element, or image alt text or title, 200 for a video title or description, 50 for a video's author or provider, 75 for a button, option, or option-group label, 150 for a select placeholder), so one oversized block cannot get the message rejected, then enforces the 50-block budget and clamps the fallback `text` to 4,000 characters.[^docs]

URL-bearing fields go through one trust policy. See [URL trust](/sdk/concepts/url-trust.md).

Related: [dispatch](/sdk/concepts/dispatch.md), [packs](/sdk/concepts/packs.md), [style adapters](/runtime/concepts/style-adapters.md).

[^docs]: Rendering

[^distillate-adapter]: Distillate HTML style adapter

[^envelope]: HTML envelope

[^anchors]: Node anchors
