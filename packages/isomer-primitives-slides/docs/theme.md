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
  glyph: { arrow, separator, dash, termJoiner }, link: { decoration }, label: { … }, connector: { … }, tone: { … }, marks: { … },
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

- **Load:** `slideHeading`, `slideStatement`, and `slideQuote` compare their text's character count with `headingFit`, `statementFit`, and `quoteFit`, a wide East Asian glyph or an emoji counting as two (`src/render/mono.ts`). `slideDefinitions` compares `rowLoad`, its longest column's characters times the column count, with `definitionsFit`, and its longer column's rows with `definitionsRowFit`, and takes the smaller step; past `definitionsSingleColumnMax` terms it splits into two columns. In a narrower layout than their measure, such as a `slideSplit` pane, statement, quote, and definitions scale their load by how many times over it falls short (`narrowing`).
- **Count:** `slideAgenda` counts its title lines, one a section and more where a title wraps across its layout's width, against `agendaFit`. `slideMatrix` steps by its row count against `matrixFit`, and `slideQuadrant` by its fullest top cell's items plus its fullest bottom cell's against `quadrantFit`, scaled by `narrowing` in a layout narrower than a frame body.
- **Width:** `slideTitle`, `slideSection`, and `slideClosing` take the largest step at which their title's longest word fits its column of the layout's width and the title holds two lines, estimated from `extraboldAdvance` glyph widths and the role's tracking. `slideCode` takes its dense size when a line would clip at the regular size across its layout's width, as well as past `codeDenseAfter` lines.
- **Height:** `slideTable` takes the largest step whose estimated height fits its layout: its caption and group labels wrapped across the layout's width, and its headings and each row as tall as their longest text wraps across a column of it, against the layout's height (`primitives/slide_table/fit.ts`). A row header is measured in its bold face, and a word wider than its line counts the lines it breaks across, as the deck's `overflow-wrap: anywhere` draws it (`packedLines`). Cell type, padding, and group spacing step together.
- **Layout:** every container sets one `layout` on the render context for its children, `{ width, height }` in pixels, and every auto-sizing primitive reads it through `slideLayout(context)` (`src/primitives/layout.ts`). `slideFrame` gives its opening `slideHeading`, and every node of a body with no heading, the whole body; below a heading it gives the height the heading leaves. `slideSplit` gives each pane its width, never more than the split has, and the height left after the pane's label and the split's footnote, each wrapped at its width, clamped at zero, so nested splits narrow and shorten in turn. `slideTitle` gives its aside the aside column. `slideStack` passes its own on. `crowding` is derived, not stored: the height below a two-line title and lede at `l`, which load budgets are set against, over the layout's height. It is 1 there, below 1 with more room, as on a slide with no heading, and above 1 with less. `slideStatement`, `slideQuote`, `slideAgenda`, `slideDefinitions`, `slideMatrix`, and `slideQuadrant` scale their load by it; every load-, count-, and width-sized primitive but `slideMatrix`, whose row labels take a fixed column, and `slideCode` measure against the width. A layout nested splits leave no width measures as zero, so its content takes the smallest step. With no container, a node reads a frame body with nothing above it.

Past the smallest step, nothing on a field says how much it holds. The agent guide says once that overflow is reported by the takumi layout check (`checkLayout`), which measures a frame's nodes against its body, and `src/examples/fit.test.ts` measures every example with takumi and fails on any `checkLayout` finding. `slideList` and `slideFanout` have no size step, so past what the body holds they are reported, not shrunk.

## Tones mean something

`slideTones` is `['primary', 'accent']`, named for theme roles rather than hues. `primary` marks the product, the runtime, or whatever is in focus; `accent` marks the host or another party. Everything else is neutral: `text`, and `line` for rails and arrows, or the quieter `textSoft`, `textSubtle`, and `border`. Authoring copy names tones and never colors, so a theme can change what each role looks like.

A tone is never color alone. A toned title puts `ToneCue` (`src/render/tone_cue.tsx`) before its text: a filled dot for `primary` and a ring for `accent`, in the tone's color, which assistive technology announces as `tone.label` ("Primary", "Accent"), or as the primitive's own names, such as `territoryGroup.toneLabel` ("Yours", "Another party"), passed as `labels`. Its `text`, `markdown`, and `slack` renderers prefix `toneCueText(tone)`, the tone's `tone.glyph` (`●` or `○`). A neutral title gets neither. A primitive that takes a `tone` uses both, so every surface carries it.

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
