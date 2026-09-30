---
type: Concept
title: Theme
description: One theme field. Palette selection is light-dark. Distillate tokens are the authoring source.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/src/theme/theme.ts
tags: [isomer, slides, theme]
status: stable
stale_after: 2027-03-18
sources:
  - id: theme
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/src/theme/theme.ts
    title: Theme
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/theme.md
    title: Theme docs
---

# Definition

The pack binds one theme. Palette values agree with Distillate tokens. Selection is light-dark, not a second authored tree.[^theme][^docs]

A primitive left without a `size` picks its step from its own text against one layout on the render context: `{ width, height }` in pixels, set by the frame (the whole body, or what its heading leaves), a split pane (its width, less its label and the footnote), a title aside, and a window body (less its border, title bar, and padding, and below a leading heading what the heading leaves), and read through `slideLayout(context)` (`slideCode`, `slideDiff`, and `slideCommand` measure its width), whose `crowding` is the reference room below a two-line title and lede over that height.[^docs]

Related: [one source](/slides/concepts/one-source.md), [distillate](/slides/concepts/distillate.md).

[^theme]: Theme

[^docs]: Theme docs
