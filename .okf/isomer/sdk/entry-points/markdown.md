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

Markdown rendering. Slack falls back to this when a primitive has no Slack renderer.[^barrel]

`md` builds Markdown as content: text, `strong`, `emphasis`, `code`, `link`, `image`, `break`, `paragraph`, `heading`, `list`, `blockquote`, `table`, `codeBlock`, and `authored` for sanitized authored source. `break` is a backslash hard break inside a paragraph and a space inside a heading, strong, emphasis, link label, or table cell, and is dropped at the start or end of any of them, `blockquote` holds builder blocks and embedded child content, and a table cell takes one inline run or several. `md.boldLabelPrefix` bolds a leading `label:` and `md.boldSectionLabel` uppercases a label in strong as its own paragraph. One GFM serializer, `serializeMarkdown`, escapes each value where it lands, prints compact tables, `-` bullets, `_` emphasis, and `**` strong, so nested strong and emphasis never share a delimiter run, and applies the URL policy again to every link, image, and definition, so one built outside `md` cannot bypass it; raw HTML nodes print as text. mdast types never appear in the entry's declarations.[^barrel]

Related: [rendering](/sdk/concepts/rendering.md), [slack](/sdk/entry-points/slack.md).

[^barrel]: Markdown entry
