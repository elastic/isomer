---
navigation_title: Isomer Studio
description: A gallery, per-primitive docs, a JSX editor and a preview of every surface for any Isomer pack, run as a dev server, a static site or a CI check.
---

# Isomer Studio

`@elastic/isomer-studio` is a dev and docs shell for any Isomer pack. Point it at a config file that exports a runtime, and it shows:

- a gallery of every primitive, grouped as the pack's authoring groups are, whose React previews mount as they near the viewport;
- a docs page per primitive, with its catalog entry, props and examples;
- a JSX or JSON editor with a live preview;
- the same composition on every surface the runtime has: React, HTML, Snapshot, PNG, Slack, Markdown and text.

It ships as a command-line tool, not a React library. EUI, Emotion and Monaco are bundled into it, so a pack never takes them as dependencies.

```sh
npm install --save-dev @elastic/isomer-studio

npx isomer-studio dev                                 # a local server with live reload
npx isomer-studio build --out dist/studio --base /studio/  # a static site
npx isomer-studio check --report studio-report.json   # a headless CI gate
```

Each command reads `isomer-studio.config.ts` (or `.tsx` or `.js`) from the current directory unless `--config` names another file.

## A first config

```ts
// isomer-studio.config.ts
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { defineStudioConfig } from '@elastic/isomer-studio';

import { myPack } from './src';

export default defineStudioConfig({
  runtime: createIsomerRuntime({ packs: [myPack] }),
});
```

That is enough for a pack whose primitives render inside a plain `view`. A pack with a frame that needs a particular root, or with styling the React surface must load, adds `compose` and `createReactContext`; see [The config](config.md).

## The app

- **Navigation.** With one pack, the sidebar lists primitives under that pack's authoring groups, in the pack's group order and alphabetically within each group. With more than one pack, each pack is a heading and its groups follow. Primitives no group claims are listed last, under Other. Each group collapses, the browser remembers which are closed, and a filter opens every group it matches. Resting the pointer on a name shows its first example and purpose.
- **Zoom.** The preview panel's zoom menu, between Surfaces and the source toggle, scales the React, HTML, Snapshot and PNG previews: Fit shrinks a preview to the panel's width and never enlarges it, and fixed levels run from 50% to 200%.
- **Color mode.** Light, Dark or System, which follows the operating system. The choice is remembered per browser, and previews render in the same mode.

## Requirements

- Node 22.13 or later.
- `react` and `react-dom` 18.2 or later, below 19, because EUI's peer range stops there.
- `@elastic/isomer-runtime`, `@elastic/isomer-sdk` and `zod`, which the pack already has.

The config, the pack and React load from the pack's own `node_modules`. The Studio checks that the config and `@elastic/isomer-runtime` see one copy of React, and stops with both paths when they don't.

## The slides Studio

This repository's reference pack has a config at `packages/isomer-primitives-slides/isomer-studio.config.ts`. Its Studio is deployed with these docs at [elastic.github.io/isomer/studio-app/](https://elastic.github.io/isomer/studio-app/), and every CI run uploads a build of it as the `slides-studio` artifact.

These docs build in two places, and the app only in one:

- GitHub Pages hosts the docs at `/isomer/studio/` and the app beside them at `/isomer/studio-app/`, so neither overwrites the other.
- Codex previews of a docs change carry the docs only. Links to the app point at its Pages URL, and a PR's app preview is the CI artifact.

## Known gaps

- **PNGs of edited compositions.** A static site has PNGs for the examples it prerendered and nothing else; an edited composition shows "PNG previews of edited compositions need `isomer-studio dev`". See [Static sites](commands.md#static-sites).
- **Slack `tag` elements.** `slack-blocks-to-jsx` cannot draw rich-text `tag` elements, so toned values render blank in the Slack preview. The Block Kit is valid, so `check` passes it.
- **Fonts in PNGs.** The config has no way to hand fonts to the rasterizer yet, so PNGs draw without the pack's fonts.
- **Web fonts in the app.** The app loads no web fonts, so EUI's Inter falls back to the system font.
