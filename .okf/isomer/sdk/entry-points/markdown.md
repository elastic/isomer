---
type: Entry Point
title: Markdown
description: '@elastic/isomer-sdk/markdown markdown renderer.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/entries/markdown.ts
tags: [isomer, sdk, api, markdown]
status: stable
stale_after: 2027-03-18
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/entries/markdown.ts
    title: Markdown entry
---

# Definition

Markdown rendering. Slack falls back to this when a primitive has no Slack renderer, translating builder content from its tree rather than from its serialization.[^barrel]

`md` builds Markdown as content: text, `strong`, `emphasis`, `code`, `link`, `image`, `paragraph`, `heading`, `list`, `table`, `codeBlock`, and `authored` for sanitized authored source. One GFM serializer, `serializeMarkdown`, escapes each value where it lands, prints compact tables, `-` bullets, `_` emphasis, and `**` strong, so nested strong and emphasis never share a delimiter run, and applies the URL policy again to every link, image, and definition, so one built outside `md` cannot bypass it; raw HTML nodes print as text. `boldLabelPrefix` and `boldSectionLabel` escape their label through it. mdast types never appear in the entry's declarations.[^barrel]

Related: [rendering](/sdk/concepts/rendering.md), [slack](/sdk/entry-points/slack.md).

[^barrel]: Markdown entry
