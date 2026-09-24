---
title: Styling
description: This pack authors CSS with Distillate, Elastic's typed CSS engine with render-driven style collection. React renderers call cls(context, ...handles) so...
url: https://docs-v3-preview.elastic.dev/pr-preview/pr-1/slides/styling
---

# Styling
## Distillate collection

This pack authors CSS with [Distillate](https://elastic.github.io/distillate/), Elastic's typed CSS engine with render-driven style collection. React renderers call `cls(context, ...handles)` so class names resolve through the HTML adapter's `resolveClassName`. `src/pack.ts` passes `styleAdapter: createDistillateHtmlStyleAdapter(slideDistillery)` to `definePrimitivePack`: it records those handles and `renderStyles` emits the Distillate stylesheet.
Used rules are discovered while rendering, via `resolveClassName`. The adapter is part of the pack, so a host supplies nothing:
```ts
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { slideDeckFrame, slidesPack } from '@elastic/isomer-primitives-slides';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
```

A runtime loading this pack alongside another styled pack emits both stylesheets. The adapter declares `ownsHandle`, so its rules are routed to its own collector rather than merged into a neighbour's.
This pack declares no `styleCollector`, and should not: every handle reaches the collector through `resolveClassName`, so no primitive here declares a `collectStyles` hook and there is no collector shape to protect. A pack that does write such hooks declares the tag, and a runtime then refuses an adapter that builds a different collector.
Pass `styleAdapter` on the runtime to replace every pack's adapter at once — including this one — which is how a host renders HTML with no CSS at all.

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
  label: 'Composition',
  language: 'json',
  code: '{ "type": "view", "body": [] }',
};

<StandaloneSlideNode node={node} />
```

This is a React convenience wrapper, not a surface — it applies `slideStylesheet()` via `dangerouslySetInnerHTML`. The HTML surface does not use it.

## Fonts on the image surface

A browser resolves `Inter` and `Roboto Mono` from the page; an image backend resolves nothing it was not handed, and an unregistered family falls back to the backend's built-in face. So a host rasterizing this pack registers both families itself.
`SLIDE_THEME.font.weight` declares 500, 600, 700, and 800, and anything that does not set a weight inherits the document default of 400. That is the set to register, per family — `src/examples/deck/fonts.ts` derives it from the theme rather than listing it, so a new weight token cannot silently fall back to the nearest registered face.
`@fontsource/inter` and `@fontsource/roboto-mono` ship woff2, which takumi decodes natively, so no conversion step is needed. Roboto Mono stops at 700; a weight the family does not ship is dropped rather than substituted.