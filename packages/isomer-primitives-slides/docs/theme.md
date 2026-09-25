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

The tree passed to `createDistillery` holds every value the pack renders. `src/theme/base.ts` holds the scales; `src/theme/components/` holds one group per primitive, composed from them; `src/theme/theme.ts` assembles the single tree:

```ts
export const SLIDE_THEME = {
  // Scales (`base.ts`).
  color: { bgPage: lightDark(…), text: lightDark(…), line: lightDark(…), primary: lightDark(…), … },
  inverse: { bg: lightDark(…), text: lightDark(…), rule: lightDark(…), connector: lightDark(…), … },
  space: { px4: px(4), …, px128: px(128) },
  radius: { chipSmall: px(8), chip: px(10), panel: px(12) },
  stroke: { panel: px(1.5), chip: px(2), hairline: px(2), rail: px(3), bar: px(4) },
  font: { family: { sans, mono }, size: { px24: px(24), …, px280: px(280) }, weight, tracking, lineHeight },
  type: { display, sectionNumber, heading, lede, body, label, mono, chrome, … },
  // Shared groups (`components/shared.ts`, `components/frame.ts`).
  frame: { … }, label: { … }, placeholder: { … }, panel: { … }, connector: { … },
  // One group per primitive (`components/<group>.ts`).
  heading: { title: type.heading, lede: type.lede, … }, section: { … }, pipeline: { … }, …
} as const;
```

Leaf kind is the decision, not the group name:

| Leaf | Emission | Used for |
| --- | --- | --- |
| `lightDark(light, dark)` | `--slide-<group>-*` holding `light-dark(…)` | Everything under `color` and `inverse`, the only groups that vary by scheme. |
| `ScaleToken` (`px`, `literal`, `paddingXy`) | Inlined literal, no custom property | `space`, `radius`, `stroke`, `font`, `type`, and every component group. |
| Plain string | Custom property with identical light/dark values | Unused here; reach for it when a host should override a non-color value. |

`space` and `font.size` are keyed by pixel value (`space.px48`, `font.size.px28`) because the canvas is a fixed 1920×1080 and the design is specified in pixels. `type` holds the design's type roles — size, weight, tracking, and leading together — and a module emits one with `typeRole(tokens.type.heading)`. A value that is off both ramps still lives in its component group, with a comment saying why.

Nothing outside this tree holds a rendered value. A primitive's `styles.ts` reads `slideDistillery.tokens.<group>`, so there is one place a value can be wrong.

Sizes are `ScaleToken` on purpose: inlining matches the frame contract, where a host wanting different geometry replaces the frame rather than overriding a token.

## Nothing below 24px

Slides are read embedded at roughly half scale, so no rule sets a `font-size` under 24px. `src/theme/modules.test.ts` scans the whole stylesheet for it. A picture of another render (`slideRender`, `slideRenderGrid`) scales its content down instead of declaring a smaller size.

## Size steps

Length-sensitive primitives take an optional `size`: `l`, `m`, or `s`, each a set of theme tokens (`titleSizes`, `bodySizes`, `valueSizes`, and so on), none below 24px. Left out, the renderer picks the step from the node's own text, so every surface draws the same size; the image surface cannot measure, and does not support container units, `min()`, or `clamp()`. An explicit `size` always wins.

- **Load:** `slideHeading`, `slideTimeline`, `slidePipeline` (numbered steps), `slideColumns`, `slideDefinitions`, and `slideGraph` compare a character load with a budget beside their theme group (`timelineFit`, `pipelineFit`, …). A row's load is its longest item's characters times the item count.
- **Width:** `slideStats` and the display titles of `slideTitle`, `slideSection`, and `slideClosing` take the largest step at which their widest value or longest word fits its column, estimated from `extraboldAdvance` glyph widths and the role's tracking.
- **Crowding:** `slideFrame` estimates how much room its opening `slideHeading` leaves and passes `crowding` to the rest of the slide on the render context: 1 under a two-line title and a two-line lede, which the budgets are set against, below 1 under a shorter heading. Load pickers scale their load by it, so the same timeline keeps `l` under a one-line heading and shrinks under a long one.

## Color means something

`primary` marks the product, the runtime, or the current item; `accentPink` marks the host. Those are the only hues, and `slideTones` is `['primary', 'pink']`. Everything else is ink (`text`, and `line` for rails and arrows) or grey (`textSoft`, `textSubtle`, `border`).

## Inverse tone

`slideFrame`'s `tone: 'inverse'` gives title, section, and closing slides the dark background. The frame redeclares the page palette for its subtree — `bgPage`, `text`, `textSoft`, `textSubtle`, `primary`, `onPrimary`, `border`, and `line` take their values from the `inverse` group — so a primitive reads the same tokens on either tone and never branches on it. In dark mode the inverse background is lifted above the page (`#12213A` over `#07101F`) so those slides still stand apart.

## Placeholders

A render or number that does not exist yet is a placeholder, never fake content: `placeholderModule` draws a 135° stripe of `placeholderStripe` and `bgPage`, a dashed `borderDashed` outline, and a centered mono caption. `slideStat`/`slideStats` without a `value` and `slideRender` without a `composition` use it.

## What the image surface draws

The `svg` surface's CSS goes to takumi, which lays out a subset of CSS. The pack relies on custom properties (including redeclaring them in a subtree), grid with `minmax(0, …)` tracks, `repeating-linear-gradient`, border-drawn triangles, `transform: scale()`, `text-wrap: balance`, and baseline alignment, all of which it renders. Two limits shape the modules:

- A block element with padding and a border around text renders taller than its content. Chips, nodes, and pills are `display: flex`.
- Roboto Mono ships no box-drawing glyphs. `slideTree` draws its connectors with borders and keeps `├`/`└` for text and Markdown.
- `@container` queries, `min()`, and `clamp()` do not apply, and `cqi` resolves against the canvas, not the container. Type that must fit is sized by [size steps](#size-steps) instead.
- A `flex: 1` child of a column with no set height collapses to nothing. The layout `fill` role uses `flex: 1 1 auto`, and centers with auto margins, so content taller than its space runs down rather than up over the heading.

## `SlidePalette`

Named colors per mode, derived from the `lightDark` pairs in `SLIDE_THEME.color`. CSS interpolates `slideDistillery.tokens.color`; `slidePaletteForMode` resolves the same group to literals through `slideDistillery.resolveValues(scheme).color`, which is what a frame reads and what the `svg` surface flattens `light-dark(…)` into.

## Fonts

`font.family.sans` is `'Inter, system-ui, sans-serif'` for the slide body and `font.family.mono` is `'Roboto Mono', ui-monospace, monospace` for code. Code needing the raw string reads `.value`. The image surface needs Inter 400–800, Inter 400 italic (the title slide's definition line), and Roboto Mono 400–500 registered with the backend.
