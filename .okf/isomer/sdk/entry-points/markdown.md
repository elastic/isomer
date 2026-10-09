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

`md` builds Markdown as content: text, `strong`, `emphasis`, `code`, `link`, `image`, `break`, `paragraph`, `heading`, `list`, `blockquote`, `table`, `codeBlock`, and `authored` for sanitized authored source. `break` is a backslash hard break inside a paragraph and a space inside a heading, strong, emphasis, link label, or table cell, and is dropped at the start or end of any of them, `blockquote` holds builder blocks and embedded child content, and a table cell takes one inline run or several. One GFM serializer, `serializeMarkdown`, escapes each value where it lands, prints compact tables, `-` bullets, `_` emphasis, and `**` strong, so nested strong and emphasis never share a delimiter run, and applies the URL policy again to every link, image, and definition, so one built outside `md` cannot bypass it; raw HTML nodes print as text. mdast types never appear in the entry's declarations.[^barrel]

`splitAuthoredMarkdown(source, { elements })` splits authored Markdown at a host's own elements, such as `<render_attachment id="…" />`, with one parse inside the `md.authored` parse budget. It returns `AuthoredMarkdownSegment`s in order: `markdown` (`content` sanitized as `md.authored` sanitizes, and the `source` it was built from) and `element` (`name`, and `attributes` as written, keyed by lower-cased name). Only a tag in text or raw HTML is cut; one in code, a link destination or title, an image, or a definition, or escaped with `\`, stays text. A tag directly in a top-level paragraph splits it in place; one inside a list, table, quote, heading, or emphasis is removed and its element follows the whole top-level block. A block that held a tag is rebuilt from its parse, dropping emphasis, list items, and paragraphs the tag leaves empty and escaping split text that would open another block; other blocks keep their source. Link and footnote definitions, top-level or nested, are copied to each segment that uses them until the copies would add more than the source's length, whitespace-only segments are dropped, and past the parse budget or recursion limit the source is cut at each tag into inert pieces.[^barrel]

Related: [rendering](/sdk/concepts/rendering.md), [slack](/sdk/entry-points/slack.md).

[^barrel]: Markdown entry
