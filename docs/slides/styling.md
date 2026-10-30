# Styling

## Distillate collection

This pack authors CSS with [Distillate](https://elastic.github.io/distillate/), Elastic's typed CSS engine with render-driven style collection. React renderers call `cls(context, ...handles)` so class names resolve through the HTML adapter's `resolveClassName`. `src/pack.ts` passes `createDistillateStyleAdapter(slideDistillery)`, from `src/theme/style_adapter.ts`, as the `styleAdapter` to `definePrimitivePack`: it records those handles and `renderStyles` emits the Distillate stylesheet. Class names are Distillate's readable names, since a compact name depends on the complete collected set, which does not exist until the markup naming it is written.

Used rules are discovered while rendering, via `resolveClassName`. The adapter is part of the pack, so a host supplies nothing:

```ts
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { slideDeckFrame, slidesPack } from '@elastic/isomer-primitives-slides';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
```

A runtime styles with one adapter. Loading this pack alongside another pack that declares a `styleAdapter` throws `AMBIGUOUS_STYLE_ADAPTER` unless the host passes its own `styleAdapter`; a pack with no adapter of its own is styled by this one.

The adapter declares `styleCollector: 'distillate'`, and the pack takes that tag from it. No primitive here declares a `collectStyles` hook — every handle reaches the collector through `resolveClassName` — so the tag never refuses this pack. It names the collector the adapter builds, so a runtime refuses to let it serve another pack whose `collectStyles` hooks declare a different tag.

Pass `styleAdapter` on the runtime to replace the one pack adapter, this one included, which is how a host renders HTML with no CSS at all.

## The React surface

The React surface returns content, not a document. The stylesheet belongs to the host. The pack exports `slideStylesheet` for exactly this purpose:

```ts
import { slideStylesheet } from '@elastic/isomer-primitives-slides';
import { renderToStaticMarkup } from 'react-dom/server';

const node = runtime.surfaces.react.render(composition);
const body = renderToStaticMarkup(node);
// Host wraps `body` in a section with `data-theme`, includes `slideStylesheet()`.
```

## `StandaloneSlideNode`

For a single node rendered outside a frame (e.g., in Storybook), `StandaloneSlideNode` inlines the stylesheet:

```tsx
import {
  StandaloneSlideNode,
  type SlideCodeNode,
} from '@elastic/isomer-primitives-slides';

const node: SlideCodeNode = {
  type: 'slideCode',
  file: 'Composition',
  language: 'json',
  text: '{ "type": "view", "body": [] }',
};

<StandaloneSlideNode node={node} />
```

This is a React convenience wrapper, not a surface — it applies `slideStylesheet()` via `dangerouslySetInnerHTML`. The HTML surface does not use it.

## Fonts on the snapshot surface

A browser resolves `Inter` and `Roboto Mono` from the page; an image backend resolves nothing it was not handed, and an unregistered family falls back to the backend's built-in face. So a host rasterizing this pack registers both families itself.

`slideFontFaces` is that set: one `{ family, weight, style }` per face the theme needs, derived from `SLIDE_THEME.font` rather than listed, so a new weight token cannot silently fall back to the nearest registered face. It holds every weight `SLIDE_THEME.font.weight` declares (400, 500, 600, 700, and 800) for Inter and all but extrabold (400 to 700) for Roboto Mono, since no mono style sets it, plus the 400 italic `titleSlide`'s definition line sets. The host maps each face to a font file; `src/examples/fonts.ts` is the worked loader, over `@fontsource/*`.

`@fontsource/inter` and `@fontsource/roboto-mono` ship woff2, which takumi decodes natively, so no conversion step is needed. Roboto Mono stops at 700, which is why its faces do. A loader drops a weight the family does not ship rather than substituting one.

The image draws no glyph outside those two families: the `check` bullet marker and the tone cue are drawn from boxes and borders, and `x` is `×`, which Inter covers. `✓`, `●`, and `○` appear only in text, Markdown, and Slack.
