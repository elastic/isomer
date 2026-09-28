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

The pack binds one theme: scales in `src/theme/base.ts`, one component group per primitive in `src/theme/components/`, assembled into `SLIDE_THEME`. Palette values agree with Distillate tokens. Selection is light-dark, not a second authored tree; an inverse frame redeclares the page palette for its subtree. Nothing is set below 24px, and the only tones are `primary` and `accent`, named for theme roles rather than hues.[^theme][^docs]

`font.family.sans` is Inter and `font.family.mono` is Roboto Mono. `slideFontFaces` derives from the theme the faces the image surface needs: Inter 400–800, Inter 400 italic for the title slide's definition line, and Roboto Mono 400–700. A host maps each face to a font file.[^docs]

Related: [one source](/slides/concepts/one-source.md), [distillate](/slides/concepts/distillate.md).

[^theme]: Theme

[^docs]: Theme docs
