---
navigation_title: The config
description: What an isomer-studio.config.ts exports, how compose wraps examples, and how the Studio loads the config in Node and the browser.
---

# The config

A config file default-exports `defineStudioConfig({ ... })`. `defineStudioConfig` returns its argument; it exists so the object is typed. The runtime exports are `defineStudioConfig` and `adoptStylesheet`, beside the `StudioConfig`, `StudioCompose`, `StudioRuntime` and `StudioTheme` types.

```ts
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';
import { adoptStylesheet, defineStudioConfig } from '@elastic/isomer-studio';

import { previewSlide } from './src/examples/preview_slide';
import { slideDeckFrame, slidesPack, slideStylesheet } from './src/index';

// Built once. `adoptStylesheet` parses it once per document.
let stylesheet: string | undefined;

export default defineStudioConfig({
  runtime: createIsomerRuntime({ packs: [slidesPack], frames: { slide: slideDeckFrame } }),
  createReactContext: (root) => {
    stylesheet ??= slideStylesheet();
    adoptStylesheet(root, stylesheet);
    return {};
  },
  compose: (nodes, { theme }): Composition => {
    const [only] = nodes;
    const preview: Composition =
      nodes.length === 1 && only ? previewSlide(only) : { type: 'view', body: [...nodes] };
    return { ...preview, theme };
  },
});
```

| Field | Required | What it does |
| --- | --- | --- |
| `runtime` | Yes | The runtime from `createIsomerRuntime`. Its packs are what the Studio lists, and its surfaces are the previews it offers. |
| `title` | No | Replaces the header, the page title, and the `check` report name. Defaults to `Isomer Studio`. Leave it unset to keep the product name; a runtime with more than one pack shows each pack in the nav. |
| `createReactContext(root)` | No | Styles the React preview, which renders inside a shadow root. Call `adoptStylesheet(root, css)` with the pack's stylesheet and return the render context its renderers expect. Without it, the React preview shows the `html` surface instead. |
| `compose(nodes, { theme })` | No | Wraps example nodes in a composition. Defaults to `{ type: 'view', body: nodes, theme }`. |

## `compose`

Examples are nodes, not compositions. Every place the Studio needs a composition, `compose` builds it: the gallery, the docs pages, the editor's preview, the PNGs a static build prerenders and every example `check` renders. A pack writes the envelope once and every mode agrees on it.

The default fits a pack whose primitives render inside a plain `view`. A pack whose frame requires a particular root writes its own. The slides frame draws exactly one `slideFrame`, so the slides `compose` wraps a lone node in a preview slide, and passes a node that is already a `slideFrame` through unwrapped.

`compose` receives the theme the Studio is showing, `light` or `dark`, and puts it on the composition. That theme is the app's color mode, so previews always match the chrome around them. Light and dark are then different compositions, which is how a static build tells their PNGs apart.

## Surfaces a runtime may lack

The Studio offers the surfaces `runtime.surfaces` has. A runtime without a frame has no `snapshot` surface, so it gets no Snapshot or PNG previews, a static build prerenders no PNGs, and `check` reports those checks as skipped.

## How the config loads

The config runs in two places: in Node, for `check` and for the dev server's PNGs, and in the browser, bundled into the app.

**In Node**, the Studio imports the config with `tsx`, which compiles TypeScript and JSX as it loads and leaves resolution to Node. The config, its pack, React and the runtime all resolve from the config's own directory, so they come from the pack's `node_modules`. `tsx` applies the `tsconfig.json` nearest the config, so the pack's `jsx` setting holds in both ES module and CommonJS projects.

`--loader none` skips `tsx` and imports the config with a plain `import()`. Use it for a JavaScript config, or to bring another loader through `NODE_OPTIONS=--import ...`. Node caches that import, so under `dev` the browser picks up edits but PNGs keep the config and pack as they were at startup; restart `dev` to refresh them.

**In the browser**, the Studio bundles the config with esbuild. `react`, `react-dom` and their subpaths resolve as if imported from the config, so the Studio's own components, Emotion and the pack share one React, and each package's browser build is the one bundled.

## One React

The Studio, the pack and the runtime must use one copy of React. Before loading the config, the Studio resolves `react` from the config and from the `@elastic/isomer-runtime` the config sees, and stops when they differ:

```text
The Studio config and @elastic/isomer-runtime resolve different copies of React:
  config:  /work/pack/node_modules/react
  runtime: /work/pack/node_modules/@elastic/isomer-runtime/node_modules/react
Install one React for both, for example by deduplicating your lockfile.
```
