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
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/rendering.md#slack-blocks-isomer-does-not-model-yet
    title: Slack blocks Isomer does not model yet
---

# Definition

Slack Block Kit rendering and payload types. Reach Slack types through this entry, not `define/slack_*`.[^barrel] `markdownContentToSlackBlocks` translates content built with `md` to `rich_text` and `table` blocks from its tree, a quote as `rich_text_quote`, and `md.authored` source by parsing it and translating its tree the same way. `SlackRichTextList` takes `offset` for an ordered list that starts past 1. `renderSlackEnvelope` splits each `rich_text` section, quote, or preformatted element past `sectionTextChars` into adjacent ones of its type without losing text, whether a renderer built it or a degraded table did.[^barrel]

A block Isomer does not model yet goes through `unmodeledSlackBlock`, which the envelope passes through unfitted and counts as one block; a literal `type` Isomer models does not compile. `isUnmodeledSlackBlock` and `isModeledSlackBlockType` back a conformance case and Studio's check that flag a wrapper left on a block Isomer now models. Each use has an issue from the **Model a Slack block** template asking Isomer to model the block.[^docs]

Related: [rendering](/sdk/concepts/rendering.md), [packs](/sdk/concepts/packs.md).

[^barrel]: Slack entry
[^docs]: Slack blocks Isomer does not model yet
