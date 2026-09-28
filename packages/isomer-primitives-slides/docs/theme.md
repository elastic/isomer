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

Slides are read embedded at roughly half scale, so no rule sets a `font-size` under 24px. `src/theme/modules.test.ts` scans the whole stylesheet for it. A picture of another render (`slideRender`, `slideRenderGrid`) scales its content down instead of declaring a smaller size. An inline `` `code` `` mark keeps its run's size rather than an `em` fraction, which would drop 26px body copy under the floor.

## Size steps

Length-sensitive primitives take an optional `size`: `l`, `m`, or `s`, each a set of theme tokens (`titleSizes`, `bodySizes`, `valueSizes`, and so on), none below 24px. Left out, the renderer picks the step from the node's own text, so every surface draws the same size; the image surface cannot measure, and does not support container units, `min()`, or `clamp()`. An explicit `size` always wins.

- **Load:** `slideHeading`, `slideStatement`, `slideQuote`, `slideTimeline`, `slidePipeline` (numbered steps), `slideColumns`, `slideDefinitions`, `slideGraph`, `slideRoadmap`, and `slideSplit` statements compare a character load with a budget beside their theme group (`timelineFit`, `pipelineFit`, …). A row's load is its longest item's characters times the item count; a split's is its busier column's statement characters, scaled to an even column's width. `slideSequence`, `slideLayers`, `slideAgenda`, `slideMatrix`, `slideBars`, and `slideQuadrant` count rows, messages, or chips instead, since their text does not wrap.
- **Width:** `slideStats`, `slideDelta`, and the display titles of `slideTitle`, `slideSection`, and `slideClosing` take the largest step at which their widest value or longest word fits its column, estimated from `extraboldAdvance` glyph widths and the role's tracking. `slideCommand` does the same for its one line of code from `monoAdvance`, with no `size` field: its length limit guarantees `s` fits.
- **Height:** `slideAnnotatedRender` picks its render scale and legend step from the legend's estimated height, with no `size` field.
- **Crowding:** `slideFrame` estimates how much room its opening `slideHeading` leaves and passes `crowding` to the rest of the slide on the render context: 1 under a two-line title and a two-line lede, which the budgets are set against, below 1 under a shorter heading. Load pickers scale their load by it, so the same timeline keeps `l` under a one-line heading and shrinks under a long one.

## Tones mean something

`slideTones` is `['primary', 'accent']`, named for theme roles rather than hues. `primary` marks the product, the runtime, or whatever is in focus, such as the current item or a highlighted option; `accent` marks the host or another party. Everything else is neutral: `text`, and `line` for rails and arrows, or the quieter `textSoft`, `textSubtle`, and `border`. Authoring copy names tones and never colors, so a theme can change what each role looks like.

A module's rules reach the stylesheet sorted by name, and a variant that overrides a base rule wins only by coming later at the same specificity. Name the override so it sorts after its base: `titleHighlighted` after `title`, not `highlightedTitle`.

## Inverse tone

`slideFrame`'s `tone: 'inverse'` gives title, section, and closing slides the dark background. The frame redeclares every `color` token for its subtree from the `inverse` group, so a primitive reads the same tokens on either tone and never branches on it; a stylesheet test fails when a `color` token has no inverse. Light-mode inverse is the dark page palette. In dark mode the inverse background is lifted above the page (`#12213A` over `#07101F`) so those slides still stand apart.

## Placeholders

A render or number that does not exist yet is a placeholder, never fake content: `placeholderModule` draws a 135° stripe of `placeholderStripe` and `bgPage`, a dashed `borderDashed` outline, and a centered mono caption. `slideStat`/`slideStats` without a `value` and `slideRender` without a `composition` use it.

## What the image surface draws

The `svg` surface's CSS goes to takumi, which lays out a subset of CSS. The pack relies on custom properties (including redeclaring them in a subtree), grid with `minmax(0, …)` tracks, `repeating-linear-gradient`, border-drawn triangles, `transform: scale()`, `text-wrap: balance`, and baseline alignment, all of which it renders. These limits shape the modules:

- A block element with padding and a border around text renders taller than its content. Chips, nodes, and pills are `display: flex`.
- Roboto Mono ships no box-drawing glyphs and no `→`. `slideTree` draws its connectors with borders and keeps `├`/`└` for text and Markdown; `−` (U+2212) is there.
- `@container` queries, `min()`, `clamp()`, and `:has()` do not apply, and `cqi` resolves against the canvas, not the container. Type that must fit is sized by [size steps](#size-steps) instead.
- `display: inline-flex` inside running text breaks the line. Inline marks stay plain inline elements.
- An inline element's border is not drawn, only its background, so an inline code chip stands out by `codeFill` alone.
- `text-wrap: pretty` is not applied, so a paragraph can end on one word. Short copy that wraps, such as a footnote, a fanout body, a section's contents, a pipeline step, or a split statement, uses `balance` instead.
- `flex: none` is ignored, so an item meant to keep its size shrinks with its row. Write `flex: 0 0 auto`; a stylesheet test rejects `flex: none`.
- A `calc()` nested inside another is not evaluated. Expand it to one level, as the pipeline's rail inset does; the same test rejects a nested one.
- A `flex: 1` child of a column with no set height collapses to nothing. The layout `fill` role uses `flex: 1 1 auto`, and centers with auto margins, so content taller than its space runs down rather than up over the heading.

It does render `text-indent` (the quote's hanging mark), inset `box-shadow`, `linear-gradient`, `transform: translate()`, `calc()` with percentages, `visibility`, `& + &` and `:last-child` selectors, and inline `style` widths and offsets.

## `SlidePalette`

Named colors per mode, derived from the `lightDark` pairs in `SLIDE_THEME.color`. CSS interpolates `slideDistillery.tokens.color`; `slidePaletteForMode` resolves the same group to literals through `slideDistillery.resolveValues(scheme).color`, which is what a frame reads and what the `svg` surface flattens `light-dark(…)` into.

## Fonts

`font.family.sans` is `'Inter, system-ui, sans-serif'` for the slide body and `font.family.mono` is `'Roboto Mono', ui-monospace, monospace` for code. Code needing the raw string reads `.value`. The image surface needs Inter 400–800, Inter 400 italic (the title slide's definition line), and Roboto Mono 400–700 registered with the backend; `slideFontFaces` lists them.
