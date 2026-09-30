---
type: Entry Point
title: Slack
description: '@elastic/isomer-sdk/slack Block Kit renderer and payload types.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/entries/slack.ts
tags: [isomer, sdk, api, slack]
status: stable
stale_after: 2027-03-18
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/entries/slack.ts
    title: Slack entry
---

# Definition

Slack Block Kit rendering and payload types. Reach Slack types through this entry, not `define/slack_*`.[^barrel] `markdownContentToSlackBlocks` translates content built with `md` to `rich_text` and `table` blocks from its tree, a quote as `rich_text_quote`; `gfmToSlackBlocks` translates a GFM string. `SlackRichTextList` takes `offset` for an ordered list that starts past 1. `splitRichTextElement` splits a section, quote, or preformatted element past `sectionTextChars` into adjacent ones of its type without losing text, as the envelope does for a degraded table.[^barrel]

Related: [rendering](/sdk/concepts/rendering.md), [packs](/sdk/concepts/packs.md).

[^barrel]: Slack entry
