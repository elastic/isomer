# Theme

## The one-field lower bound

```ts
export interface SlideFrameTheme {
  text: string; // CSS color for body text
}
```

`SlideFrameTheme` is the minimum this pack places on a frame. One field means any richer host palette satisfies it structurally. Primitives read none of it — they reach the `svg` surface through their `react` renderers and this pack's stylesheet — so it exists for a frame drawing its own surround.

## Palette resolution

`slidePaletteForMode(mode: 'light' | 'dark'): SlidePalette` returns the named colors for one scheme as literals, resolved from the `lightDark` pairs in `SLIDE_THEME.color`.

## `slideThemes`

```ts
export const slideThemes: ThemePair<SlideFrameTheme> = {
  light: { text: slidePaletteForMode('light').text },
  dark:  { text: slidePaletteForMode('dark').text },
};
```

These are the values `slideDeckFrame.theme` holds. A host can override them — or override the whole frame — to use a custom palette.

## `SLIDE_THEME`

The tree passed to `createDistillery` holds every value the pack renders, in `src/theme/theme.ts`:

```ts
export const SLIDE_THEME = {
  // Scales.
  color: { bgPage: lightDark(…), text: lightDark(…), … },
  size: { xxs: px(4), xs: px(8), s: px(12), m: px(16), l: px(24), … },
  radius: { s: px(4), m: px(6), pill: px(999) },
  font: { family: { sans, mono }, size: { … }, heading: { … }, weight: { … }, tracking: { … } },
  // One group per primitive, composed from the scales above.
  frame: { width: px(1920), paddingX: px(96), brandGap: size.s, … },
  title: { rootMaxWidth: px(1520), sizes: { hero: { … }, … }, … },
  cards: { radius: radius.m, meta: { … }, styles: { feature: { … }, … } },
  code: { fontSize: font.size.l, dense: { … } },
  bullets: { … }, flow: { … }, split: { … }, stack: { … }, territory: { … },
  label: { … }, logo: { … },
} as const;
```

Leaf kind is the decision, not the group name:

| Leaf | Emission | Used for |
| --- | --- | --- |
| `lightDark(light, dark)` | `--slide-color-*` holding `light-dark(…)` | Everything under `color`, the only group that varies by scheme. |
| `ScaleToken` (`px`, `literal`, `paddingXy`) | Inlined literal, no custom property | `size`, `radius`, `font`, and the padding shorthands composed from `size`. |
| Plain string | Custom property with identical light/dark values | Unused here; reach for it when a host should override a non-color value. |

`size` is a 4px grid with `m` as the 16px base, and each primitive's group composes from it (`stack.gap.normal` is `size.l`, `bullets.padding` is `size.l`). A value that does not land on the grid still lives in its group, with a comment saying why — `flow.connectorHeight` is a hairline rule, `frame.paddingX` is canvas chrome, `title.sizes.*.headingMaxWidth` is a measure on the canvas, `logo.mark` is a glyph box.

Nothing outside this tree holds a rendered value. A primitive's CSS module reads `slideDistillery.tokens.<group>`, so there is one place a value can be wrong.

Sizes are `ScaleToken` on purpose: inlining matches the frame contract, where a host wanting different geometry replaces the frame rather than overriding a token.

## `SlidePalette`

Named colors per mode, derived from the `lightDark` pairs in `SLIDE_THEME.color`. CSS interpolates `slideDistillery.tokens.color`; `slidePaletteForMode` resolves the same group to literals through `slideDistillery.resolveValues(scheme).color`, which is what a frame reads and what the `svg` surface flattens `light-dark(…)` into.

## Fonts

`font.family.sans` is `'Inter, system-ui, sans-serif'` for the slide body and `font.family.mono` is `'Roboto Mono', ui-monospace, monospace` for code blocks. Code needing the raw string reads `.value`.
