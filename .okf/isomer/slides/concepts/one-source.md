---
type: Concept
title: One source per rendered value
description: Every number, length, ratio, and glyph the pack draws has one authoring source in its theme.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/primitives.md
tags: [isomer, slides, theme]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/primitives.md
    title: Authoring a primitive
  - id: agents
    resource: https://github.com/elastic/isomer/blob/main/AGENTS.md
    title: Agent instructions
---

# Definition

A pack holds no rendered value of its own. Before adding a number, length, ratio, or glyph, put it in the theme and read it from there. Duplicating a literal in a renderer is a bug, not a shortcut.[^docs][^agents]

Icons are exempt: their geometry and fallback colours are host-facing defaults the pack never draws. Every fallback colour still has one source, `src/theme/icon_hues.ts`.[^docs]

Related: [theme](/slides/concepts/theme.md), [conventions](/workspace/reference/conventions.md).

[^docs]: Authoring a primitive

[^agents]: Agent instructions
