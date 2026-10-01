---
type: Entry Point
title: React
description: '@elastic/isomer-sdk/react React renderer helpers.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/entries/react.ts
tags: [isomer, sdk, api, react]
status: stable
stale_after: 2027-03-18
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/entries/react.ts
    title: React entry
---

# Definition

React renderer helpers. The image surface reuses these renderers; primitives do not write a separate `svg` renderer. `applyEnhancements` resolves enhancement definitions against a body for a React render: it returns the ones that apply, first of each id, and a view of the context carrying their ids as `enhancements`, with `anchors` on when one declares `anchors: true`. It also holds the browser-side helpers that type against the DOM: `runEnhancementScript`, `findNodeElementPairs`, and `measureDom`.[^barrel]

Related: [rendering](/sdk/concepts/rendering.md), [no svg renderer](/slides/concepts/no-svg-renderer.md).

[^barrel]: React entry
