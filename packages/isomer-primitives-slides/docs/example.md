# Worked example

`src/examples/deck.tsx` holds two compositions: a title slide and a content slide. `src/examples/deck.test.ts` validates both, writes the title slide's Markdown, text, and PNG, and writes the pair as `deck.pdf`, all under `src/examples/output/`. A host sequences compositions; Isomer renders one at a time.

## A deck is a `Composition[]`

`slideJsx` authors each slide, and `toComposition` is the `Composition` the test renders. The title slide is an inverse frame. `TitleSlide.Aside` holds the bullet list, and `SlideFrame.Footer` fills the footer:

```tsx
<Composition title="Isomer">
  <SlideFrame tone="inverse">
    <TitleSlide
      eyebrow="Reference pack"
      title="Isomer"
      tagline="One composition, **every surface**."
    >
      <TitleSlide.Aside>
        <SlideBulletList marker="check">
          <SlideBulletList.Item>React and HTML</SlideBulletList.Item>
          <SlideBulletList.Item>Markdown and plain text</SlideBulletList.Item>
          <SlideBulletList.Item>Slack Block Kit</SlideBulletList.Item>
          <SlideBulletList.Item>SVG and PNG</SlideBulletList.Item>
        </SlideBulletList>
      </TitleSlide.Aside>
    </TitleSlide>
    <SlideFrame.Footer brand="Isomer" url="https://elastic.github.io/isomer" />
  </SlideFrame>
</Composition>
```

The runtime sees one composition at a time. A host renders them in order and assembles the deck. The content slide is a page frame opening with a `SlideHeading` over a `SlideSplitLayout`. Each column is a `SlideSplitLayout.Pane`, and the pane's primitives are its children: a `SlideCode` on the left, a `SlideBulletList` on the right, joined with an arrow.

## Surface artifacts

A slide other than a quote opens with its own heading, so the example renders Markdown and text with `heading: false`: the composition `title` names the slide without repeating it.

### Title slide

```markdown
# Isomer

_Reference pack_

One composition, **every surface**.

- ✓ React and HTML
- ✓ Markdown and plain text
- ✓ Slack Block Kit
- ✓ SVG and PNG

_Isomer · [elastic.github.io/isomer](https://elastic.github.io/isomer)_
```

```text
REFERENCE PACK
Isomer
One composition, every surface.

✓ React and HTML
✓ Markdown and plain text
✓ Slack Block Kit
✓ SVG and PNG

Isomer · elastic.github.io/isomer
```

## Getting a PNG

The `snapshot` surface returns `{ element, css, width, height }` — the React tree, the pack's stylesheet with `light-dark(…)` already resolved to the render's scheme, and the viewport it was measured for. It does not return an image: rasterizing is a separate capability a host opts into.

`@elastic/isomer-image-takumi` is that capability for this repo:

```ts
import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';

const takumi = createTakumiImageBackend({ fonts });
const png = await takumi.png(runtime.surfaces.snapshot.render(composition));
```

`fonts` is the host's, and it is not optional in practice — an unregistered family falls back to the backend's built-in face, so an unfonted render is visibly not this pack. [Fonts on the `snapshot` surface](styling.md#fonts-on-the-snapshot-surface) covers which families and weights to register; `src/examples/fonts.ts` is the worked version, deriving the faces from `slideFontFaces`.

`title-slide.png` is written by the same test that writes the Markdown and text artifacts, with one difference: `toMatchFileSnapshot` is text-only, so the PNG case hand-rolls its own comparison, and that comparison is CI-only. A local run always rewrites the artifact — a takumi or font bump would otherwise fail every PNG case on the bump alone, not on a real regression — so `git diff` on the file is the review step. Under `CI`, a missing artifact fails instead of being written, and byte equality is asserted against the committed artifact. CI runs Ubuntu only, so this verifies same-input determinism on linux-x64; cross-platform stability (darwin-arm64 producing the same bytes) is an operating assumption at a pinned `@takumi-rs/core` and a fixed font set, not independently verified here — see `@elastic/isomer-image-takumi`'s [Determinism](../../isomer-image-takumi/docs/index.md#determinism) section.

The same test writes `deck.pdf`: the whole deck as one document, a page per slide, through `runtime.surfaces.snapshot.renderPages(deck)` and the backend's `pdf`. Its `creationDate` is fixed so the bytes do not carry the render time, and it is compared the way the PNG is.
