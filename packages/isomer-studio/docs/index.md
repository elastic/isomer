---
navigation_title: Isomer Studio
description: A gallery, per-primitive docs, a JSX editor and a preview of every surface for any Isomer pack, run as a dev server, a static site or a CI check.
---

# Isomer Studio

`@elastic/isomer-studio` is a dev and docs shell for any Isomer pack. Point it at a config file that exports a runtime, and it shows:

- a Home page with search, featured primitives, the pack's apps, and what the runtime loaded;
- a gallery of every primitive, grouped as the pack's authoring groups are, whose React previews mount as they near the viewport;
- a docs page per primitive, with its catalog entry, props and examples;
- a JSX or JSON editor with a live preview;
- the same composition on every surface the runtime has: React, HTML, Snapshot, PNG, Slack, Markdown and text.

It ships as a command-line tool, not a React library. EUI, Emotion and Monaco are bundled into it, so a pack never takes them as dependencies. The package is private and not published to npm; this repository runs it.

```sh
pnpm studio:dev                                       # a local server with hot updates
pnpm exec isomer-studio build --out dist/studio --base /studio/  # a static site
pnpm exec isomer-studio check --report studio-report.json   # a headless CI gate
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

- **Home.** An empty or unknown hash, `#/home`, and the mark in the header open Home. It has the primitive search, one chip per authoring group that opens the gallery at that group, the featured primitives (the config's `featured`, or six drawn at random) with Docs and Dev links, a tile per app, three doors into the gallery, the workbench and the docs site, a chart of the surfaces the runtime has, and a panel of the packs, views, apps and surfaces loaded. With no apps or no views, the panel and the Applications row say how to add them and link to the docs. Home keeps its own dark look; the color mode applies from Dev and Docs on.
- **Navigation.** With one pack, the sidebar lists primitives under that pack's authoring groups, in the pack's group order and alphabetically within each group. With more than one pack, each pack is a heading and its groups follow. Primitives no group claims are listed last, under Uncategorized. Each group collapses, the browser remembers which are closed, and a filter opens every group it matches. Resting the pointer on a name shows its first example and purpose.
- **Surfaces.** The Dev preview starts on All surfaces. Cards stay in one column until the pane is wide enough for two, and do not go to three. The Surface menu checks the surfaces to compare: with every surface selected, choosing one shows it at full size, and choosing another adds it. Rendered or Source applies to every card at once. The Docs example card starts on the first surface, with the example picker on the left and the same menu on the right. Its footer shows that example as JSX or JSON.
- **Zoom.** With one surface picked, the preview's zoom menu scales the React, HTML, Snapshot and PNG previews: Fit width shrinks a preview to the panel's width and never enlarges it, and fixed levels run from 50% to 200%.
- **Color mode.** The header offers Light, Dark, and System. System follows the operating system, including when it changes. The choice is remembered per browser, and previews render in the resolved mode. In dark mode the Dev preview pane takes the theme's recessed background.

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
- **PDFs on a static site.** Only `dev` writes PDFs, so an app's `renderPdf` is `undefined` in a static build.
- **Slack `tag` elements.** `slack-blocks-to-jsx` cannot draw rich-text `tag` elements, so toned values render blank in the Slack preview. The Block Kit is valid, so `check` passes it.
- **Web fonts in the app.** The app loads no web fonts, so EUI's Inter falls back to the system font.
