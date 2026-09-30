---
type: Playbook
title: Author a primitive
description: Colocate renderers, read values from the theme, skip a second svg tree.
tags: [isomer, slides, playbook]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/primitives.md
    title: Authoring a primitive
---

# Steps

1. Add the primitive under `src/primitives/<type>/` with its schema as the declaration, then register it in `src/registry.ts`, `src/body_node.ts`, `src/pack_authoring.ts`, `src/stylesheet.ts`, and `src/theme/theme.ts`. Brand child fields with `fromChildren` or `fromTextChildren`. Hand-write `types.ts` only for a `schemaFor` container.
2. Put every drawn value in the theme first.
3. Implement `react`, `text`, `markdown`, and `slack`. `markdown` returns `md` builder content, never a string. Build Slack `header`, `section`, field, and `context` blocks through `src/render/slack_text.ts`, which falls back to `rich_text` rather than clamp, split by `slackRichText` into elements within a section's limit, and pass it the authored text each `mrkdwn` string carries, so text Slack would format goes as literal rich text; send code through `slackCodePanel`. Reuse `react` for image layout, and spread `nodeAnchor` on its root.
4. If you draw inside an inline `<svg>`, set literal `fill` / `stroke` alongside the class.
5. A `tone` is never color alone: put `ToneCue` first in the toned title and prefix `toneCueText(tone)` on text, Markdown, and Slack.
6. Add an example at the most items, lines, or panels the schema takes, in representative copy, so the fit test measures the most structure; it does not prove every schema-valid string fits. Cap authored strings with `lineText()` or `wrappedText()`, whose `authoredTextMaxLength` is an input-size guard, and leave overflow to the layout check.[^docs]
7. To size to the room, read `slideLayout(context)` (`width`, `height`, and the derived `crowding`); a container gives its children theirs with `withLayout(context, { width, height })` after taking out what it draws around them. Measure text with `measureText(text, role, width)` against the role its styles use at the step tried, with `text-transform` and `white-space` on the role.[^docs]
8. Write a refinement through `src/primitives/cross_field.ts` with the `rule` a kept description states it in; `z.toJSONSchema` drops refinements, and `src/stated_rules.test.ts` checks every one.[^docs]

Related: [one source](/slides/concepts/one-source.md), [no svg renderer](/slides/concepts/no-svg-renderer.md).

[^docs]: Authoring a primitive
