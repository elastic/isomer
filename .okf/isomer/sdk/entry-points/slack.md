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
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/rendering.md#how-slack-output-is-fitted
    title: How Slack output is fitted
---

# Definition

Slack Block Kit rendering and payload types, with the envelope that fits blocks to Slack's limits. See the package doc on how Slack output is fitted.[^docs]

Reach Slack types through this entry, not `define/slack_*`. `SlackRichTextList` takes `offset` for an ordered list that starts past 1.[^barrel]

`SlackContainerBlock` is Block Kit's titled, optionally collapsible group of up to 10 `SlackContainerChildBlock`s; `slackContainer(title, children, options)` builds one from a section's rendered body, unwrapping a nested container and falling back to a `header` and the blocks when the body has none or too many.[^docs]

Related: [rendering](/sdk/concepts/rendering.md), [packs](/sdk/concepts/packs.md).

[^barrel]: Slack entry
[^docs]: How Slack output is fitted
