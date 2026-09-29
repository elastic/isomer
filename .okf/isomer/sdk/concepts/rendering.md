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

Renderers return envelopes, not bare strings or elements. The text, markdown, and Slack envelopes take `heading`, which defaults to `true`; `false` leaves out the title and subtitle, and Slack's default fallback `text` with them. HTML may run a style adapter and pack `collectStyles` hooks. `createDistillateHtmlStyleAdapter` publishes `DISTILLATE_STYLE_COLLECTOR`; combining adapters is the runtime's job.[^docs][^distillate-adapter]

The Slack envelope always returns a postable payload. It clamps every Slack-limited text in the blocks a renderer returns to its `SLACK_LIMITS` entry, keeping the leading text and an ellipsis, then degrades tables past the message-wide cell budget and trims blocks past the 50-block budget. The markdown fallback for a primitive without a `slack` renderer reads content built with `md` from its tree through `markdownContentToSlackBlocks`: `rich_text` with literal text and style flags for paragraphs, headings, lists, quotes, and code, and `table` blocks for tables. A string result goes through `gfmToSlackBlocks`, which reads GFM backslash escapes and numeric character references outside code spans as literal characters, so neither reaches Slack and an escaped delimiter is never converted to formatting; Slack may still format a literal pair itself. Emphasis follows GFM's `*` and `_` rules and nests with bold, an image becomes a link to its source, and a link label or table cell prints as plain text. On both paths a hard break becomes a line break and a quote one level, or the item's text inside a list item; a quote holding a list, table, or code block takes the string path, which reads LF and CRLF line endings and keeps a quoted code fence as written. That path reads a line at a time and pairs delimiters without CommonMark's delimiter-run algorithm, so constructs spanning lines and deep or same-delimiter nesting are not exact.[^docs]

HTML returns `{ html, css, js, body, measurement, validationErrors }`. Every script it carries is a function body with `root`, the `.isomer` section, in scope, and each part runs in its own function. `scripts: 'embedded'` (the default) puts one `<script>` in `html` that binds `root` to its parent section. It never runs in a shadow root or when the host inserts `html` itself, so those hosts use `scripts: 'host'`: no `<script>`, and the host calls `runEnhancementScript(js, section)`. An embedded script with no root warns; `runEnhancementScript` throws `ENHANCEMENT_ROOT_MISSING` without a section and warns when the section also carries an embedded script. It uses `new Function`, so a strict CSP needs `'unsafe-eval'`. The render resolves `enhancements` once against every pack's definitions: each renderer's context carries the resolved set as `context.enhancements`, through a view of the adapter's context, and `js` carries each resolved enhancement's script once, after the caller's and the adapter's.[^docs][^envelope]

Node anchors let runtime code find a node's element. A `react` renderer spreads `nodeAnchor(context, node)` on its root, which sets `data-isomer-node` to the node's escaped type (`anchorValue`). During an HTML render the surface decides whether anchors render, holding the decision in a render-scoped slot rather than writing to the adapter's context: on when a resolved enhancement declares `anchors: true` or a test passes `anchors: true`. Outside one, on the React and `svg` surfaces, `context.anchors` decides, which `withNodeAnchors(context)` sets on a view of the context. `withoutAnchors(context)` returns a view of the context, not a copy, that turns anchors off for content that is not a node's `children`. `findNodeElements` pairs nodes and elements by type and order, and `findNodeElementPairs` lists the same pairing per occurrence, so a node object used twice pairs twice. An enhancement the host drives has no `script`. `checkLayout(layout, body, walk, surface)` pairs a measured `LayoutBox` tree with nodes by the same rule and returns advisory `LayoutFinding`s: `overflow` past the nearest anchored ancestor's box, or the canvas at the top level, and `overlap` between siblings under one anchored parent, with nothing inside a scaled box checked. `measureDom(root)` builds that tree from a browser's DOM.[^docs][^anchors]

URL-bearing fields go through one trust policy. See [URL trust](/sdk/concepts/url-trust.md).

Related: [dispatch](/sdk/concepts/dispatch.md), [packs](/sdk/concepts/packs.md), [style adapters](/runtime/concepts/style-adapters.md).

[^docs]: Rendering

[^distillate-adapter]: Distillate HTML style adapter

[^envelope]: HTML envelope

[^anchors]: Node anchors
