---
type: Concept
title: Pack
description: Nine slide-deck primitives, six surfaces, one Distillate HTML adapter.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/src/pack.ts
tags: [isomer, slides]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.6, at: 2026-09-18T22:35:00Z }
sources:
  - id: pack
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/src/pack.ts
    title: slidesPack
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/index.md
    title: Pack overview
---

# Definition

The in-repo reference pack. Primitives: `slideFrame`, `slideSplit`, `slideStack`, `slideBulletList`, `slideCardGroup`, `slideCode`, `slideFlow`, `slideTerritoryGroup`, `slideTitle`. Surfaces: React, HTML, text, Markdown, Slack, and SVG, the last only when the runtime is given frames. The pack ships its own Distillate HTML adapter and declares `styleCollector: DISTILLATE_STYLE_COLLECTOR`.[^pack][^docs]

Related: [theme](/slides/concepts/theme.md), [one source](/slides/concepts/one-source.md), [document](/slides/concepts/document.md).

[^pack]: slidesPack

[^docs]: Pack overview
