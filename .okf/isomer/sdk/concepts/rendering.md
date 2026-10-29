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
  - id: envelope
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/render/html/envelope.ts
    title: HTML envelope
  - id: anchors
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/render/anchors.ts
    title: Node anchors
---

# Definition

The rendering layer wraps a composition's rendered body in an envelope per format (text, markdown, Slack, HTML), with style adapters, enhancements, node anchors, and Slack fitting. See the package doc on rendering.[^docs]

Every envelope prints the title and subtitle as text; the markdown one escapes them through `serializeMarkdown`.[^docs]

The render resolves `enhancements` once against every pack's definitions: each renderer's context carries the resolved set as `context.enhancements`, through a view of the adapter's context, and `js` carries each resolved enhancement's script once, after the caller's and the adapter's.[^envelope]

URL-bearing fields go through one trust policy. See [URL trust](/sdk/concepts/url-trust.md).

Related: [dispatch](/sdk/concepts/dispatch.md), [packs](/sdk/concepts/packs.md), [style adapters](/runtime/concepts/style-adapters.md).

[^docs]: Rendering

[^envelope]: HTML envelope
