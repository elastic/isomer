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

React renderer helpers. The `snapshot` surface reuses these renderers; primitives do not write a separate `snapshot` renderer. `applyEnhancements` resolves enhancement definitions against a body for a React render, as the `html` surface does: it returns the ones that apply, first of each id and limited to `requested` ids when given, and a view of the context carrying their ids as `enhancements`, with `anchors` on when one declares `anchors: true`. It also holds the browser-side helpers `runEnhancementScript`, `findNodeElementPairs`, and `measureDom`.[^barrel]

`renderMarkdownContent(content)` renders content built with `md`, or `md.authored` source, as unstyled React elements from the parse the Markdown and Slack surfaces read, so a pack needs no Markdown parser of its own. Links and images keep `md`'s URL policy: a blocked link keeps its label on `#`, and a blocked image prints its alt text.

Related: [rendering](/sdk/concepts/rendering.md), [no snapshot renderer](/slides/concepts/no-snapshot-renderer.md).

[^barrel]: React entry
