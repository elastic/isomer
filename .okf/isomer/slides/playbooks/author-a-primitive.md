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
3. Implement `react`, `text`, `markdown`, and `slack`. `markdown` returns `md` builder content, never a string. Reuse `react` for image layout, and spread `nodeAnchor` on its root.
4. If you draw inside an inline `<svg>`, set literal `fill` / `stroke` alongside the class.
5. A `tone` is never color alone: put `ToneCue` first in the toned title and prefix `toneCueText(tone)` on text, Markdown, and Slack.
6. Add an example at the most content the schema takes, so the fit test measures it. If it overflows under the tallest heading, end the field's `describe` with `layoutCheckNote`.[^docs]

Related: [one source](/slides/concepts/one-source.md), [no svg renderer](/slides/concepts/no-svg-renderer.md).

[^docs]: Authoring a primitive
