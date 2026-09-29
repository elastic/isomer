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
  type: { display, heading, lede, body, label, mono, chrome, … },
  // Shared groups (`components/shared.ts`, `components/marks.ts`).
  glyph: { arrow, separator, dash }, label: { … }, connector: { … }, placeholder: { … }, marks: { … },
  // One group per primitive (`components/<group>.ts`).
  frame: { … }, heading: { title: type.heading, lede: type.lede, … }, split: { … }, …
} as const;
```

Leaf kind is the decision, not the group name:

| Leaf | Emission | Used for |
| --- | --- | --- |
| `lightDark(light, dark)` | `--slide-<group>-*` holding `light-dark(…)` | Everything under `color` and `inverse`, the only groups that vary by scheme. |
| `ScaleToken` (`px`, `literal`, `paddingXy`) | Inlined literal, no custom property | `space`, `radius`, `stroke`, `font`, `type`, `glyph`, and every component group. |
| Plain string | Custom property with identical light/dark values | Unused here; reach for it when a host should override a non-color value. |

`space` and `font.size` are keyed by pixel value (`space.px48`, `font.size.px28`) because the canvas is a fixed 1920×1080 and the design is specified in pixels. `type` holds the design's type roles — size, weight, tracking, and leading together — and a module emits one with `typeRole(tokens.type.heading)`. A value that is off both ramps still lives in its component group, with a comment saying why.

Nothing outside this tree holds a rendered value. A primitive's `styles.ts` reads `slideDistillery.tokens.<group>`, and its `text`, `markdown`, and `slack` renderers read the same tokens for any glyph they print, so there is one place a value can be wrong.

Sizes are `ScaleToken` on purpose: inlining matches the frame contract, where a host wanting different geometry replaces the frame rather than overriding a token.

## Nothing below 24px

Slides are read embedded at roughly half scale, so no rule sets a `font-size` under 24px. `src/theme/modules.test.ts` scans the whole stylesheet for it. An inline `` `code` `` mark keeps its run's size rather than an `em` fraction, which would drop 26px body copy under the floor.

## Size steps

Length-sensitive primitives take an optional `size`: `l`, `m`, or `s`, each a set of theme tokens (`heading.titleSizes`, `title.displaySizes`), none below 24px. Left out, the renderer picks the step from the node's own text, so every surface draws the same size; the image surface cannot measure, and does not support container units, `min()`, or `clamp()`. An explicit `size` always wins.

- **Load:** `slideHeading` compares its title's character count with `headingFit`, a wide East Asian glyph or an emoji counting as two (`src/render/mono.ts`). `slideBars` counts two per bar and one per detail line against `barsFit`.
- **Count:** `slideMatrix` steps by its row count against `matrixFit`, and `slideQuadrant` by its fullest top cell's items plus its fullest bottom cell's against `quadrantFit`.
- **Width:** `slideTitle` takes the largest step at which its longest word fits its column and the title holds two lines, estimated from `extraboldAdvance` glyph widths and the role's tracking. `slideStats` and `slideDelta` take the largest of the shared `statValueSizes` at which every value fits its column, so values in one row share a size.
- **Crowding:** `slideFrame` estimates how much room its opening `slideHeading` leaves and passes `crowding` to the rest of the slide on the render context: 1 under a two-line title and a two-line lede, below 1 under a shorter heading. Primitives below the heading that size by load or count pass it to `sizeForLoad`: `slideBars`, `slideMatrix`, and `slideQuadrant`.

Where the theme cannot guarantee that the smallest step fits, a field's `describe` says so and points at the layout check. `src/examples/fit.test.ts` measures every example with takumi and fails on any `checkLayout` finding.

## Placeholders

A number that is not measured yet is left out, never invented. `slideStat`, `slideStats`, and `slideDelta` then draw `placeholderModule`: a striped box captioned `placeholder.caption`, one line of the value's type tall, so the row keeps its shape. Text, Markdown, and Slack print the same caption.

## Tones mean something

`slideTones` is `['primary', 'accent']`, named for theme roles rather than hues. `primary` marks the product, the runtime, or whatever is in focus; `accent` marks the host or another party. Everything else is neutral: `text`, and `line` for rails and arrows, or the quieter `textSoft`, `textSubtle`, and `border`. Authoring copy names tones and never colors, so a theme can change what each role looks like.

A module's rules reach the stylesheet sorted by name, and a variant that overrides a base rule wins only by coming later at the same specificity. Name the override so it sorts after its base: `titleHighlighted` after `title`, not `highlightedTitle`.

## Inverse tone

`slideFrame`'s `tone: 'inverse'` gives the title slide the dark background. The frame redeclares every `color` token for its subtree from the `inverse` group, so a primitive reads the same tokens on either tone and never branches on it; a stylesheet test fails when a `color` token has no inverse. Light-mode inverse is the dark page palette. In dark mode the inverse background is lifted above the page (`#12213A` over `#07101F`) so those slides still stand apart.

## What the image surface draws

The `svg` surface's CSS goes to takumi, which lays out a subset of CSS. The pack relies on custom properties (including redeclaring them in a subtree), grid with `minmax(0, …)` tracks, border-drawn triangles, `text-wrap: balance`, and baseline alignment, all of which it renders. These limits shape the modules:

- A block element with padding and a border around text renders taller than its content. Chips and markers are `display: flex`.
- `@container` queries, `min()`, `clamp()`, and `:has()` do not apply, and `cqi` resolves against the canvas, not the container. Type that must fit is sized by [size steps](#size-steps) instead.
- `display: inline-flex` inside running text breaks the line. Inline marks stay plain inline elements.
- An inline element's border is not drawn, only its background, so an inline code chip stands out by `codeFill` alone.
- `text-wrap: pretty` is not applied, so a paragraph can end on one word. Short copy that wraps, such as a footnote or a tagline, uses `balance` instead.
- `flex: none` is ignored, so an item meant to keep its size shrinks with its row. Write `flex: 0 0 auto`; a stylesheet test rejects `flex: none`.
- A `calc()` nested inside another is not evaluated; the same test rejects one.
- `display: contents` is laid out as a block, so a table's rows cannot share one grid. `slideTable` and `slideMatrix` make each row its own grid with the same tracks, and give the table elements explicit roles, since some browsers drop table semantics once `display` changes.
- A `flex: 1` child of a column with no set height collapses to nothing. The layout `fill` role uses `flex: 1 1 auto`, and centers with auto margins, so content taller than its space runs down rather than up over the heading.

## `SlidePalette`

Named colors per mode, derived from the `lightDark` pairs in `SLIDE_THEME.color`. CSS interpolates `slideDistillery.tokens.color`; `slidePaletteForMode` resolves the same group to literals through `slideDistillery.resolveValues(scheme).color`, which is what a frame reads and what the `svg` surface flattens `light-dark(…)` into.

## Fonts

`font.family.sans` is `'Inter, system-ui, sans-serif'` for the slide body and `font.family.mono` is `'Roboto Mono', ui-monospace, monospace` for code. Code needing the raw string reads `.value`. The image surface needs Inter 400–800, Inter 400 italic (the title slide's definition line), and Roboto Mono 400–700 registered with the backend; `slideFontFaces` lists them.
