---
type: Concept
title: Config contract
description: A Studio config supplies a runtime, and optionally a title, createReactContext, compose and apps; the CLI supplies JSX compilation and PNGs per mode.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/config.ts
tags: [isomer, studio]
status: stable
stale_after: 2027-04-07
sources:
  - id: config
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/config.ts
    title: Config types
  - id: compose
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/model/compose_example.ts
    title: composeExample
  - id: loader
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/node/load_config.ts
    title: Config loader
  - id: stylesheet
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/surfaces/adopt_stylesheet.ts
    title: adoptStylesheet
  - id: dev
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/node/dev_bundle.ts
    title: Dev server Vite config
  - id: apps
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/apps/app_host.tsx
    title: App host
---

# Definition

A config default-exports `defineStudioConfig({ runtime, title?, createReactContext?, compose?, apps? })`. `createReactContext(root)` styles the React preview inside a shadow root; without it the React preview shows the `html` surface. `adoptStylesheet(root, css)` parses that CSS once per document and adopts the sheet onto each preview's shadow root, appending a `style` element where constructable stylesheets are missing.[^stylesheet] `compose(nodes, { theme })` wraps example nodes in a composition and defaults to `{ type: 'view', body: nodes, theme }`. `theme` is the resolved color mode, `light` or `dark`. The header offers Light, Dark, and System; System follows `prefers-color-scheme` as it changes, and the choice is remembered in `localStorage`, so previews match the chrome.[^config]

The header and the page title are `Isomer Studio` unless `title` replaces them; `title` is also the `check` report name. With one pack, the sidebar lists that pack's primitives under its authoring groups. With more than one, each pack is a heading and its groups follow. Groups stay in pack order, each sorted by label, with ungrouped primitives last under Uncategorized (`UNCATEGORIZED_GROUP_TITLE`). Groups collapse, closed ones are remembered in `localStorage` (keyed by pack and group when there is more than one pack), and a filter forces every matching group open.

`composeExample` is the one place a composition is built from examples: the gallery, docs, editor, static PNG prerendering and `check` all call it, so a pack whose frame needs a particular root (the slides frame needs one `slideFrame`) writes the envelope once.[^compose]

Surfaces come from `runtime.surfaces`: without a `snapshot` surface there are no Snapshot or PNG previews, no prerendered PNGs, and `check` skips those checks. The Dev preview defaults to every surface as a grid of 16:9 cards and shows one at full size when picked; the Docs example card picks from the same list.

For `check` and `build`, the config loads once in Node through `tsx`'s `tsImport` with the nearest `tsconfig.json`, also passed as `TSX_TSCONFIG_PATH` so CommonJS projects compile JSX the same way. `dev` loads it through a Vite module runner on the server-side environment instead: on a change that reaches the config, the `hotUpdate` hook invalidates the changed modules and their importers in the runner, re-imports the config, and only then lets the browser update. Packages in `node_modules` are externalized, so they load once and stay single copies. `--loader none` uses a plain `import()`, which Node caches, so `dev` hot-updates the browser but keeps the Node config it started with. Before loading, the Studio compares the React the config resolves with the one beside the `@elastic/isomer-runtime` it resolves, and throws naming both when they differ. `react-dom/server` comes from the config's React through `createRequire`. In the static build's bundle, an esbuild plugin re-resolves `react`, `react-dom` and their subpaths from the config's directory, keeping each package's `browser` mapping; `dev` gets the same with Vite's `resolve.dedupe` rooted at the config's directory.[^loader]

In `dev`, the page loads a virtual entry that mounts the Studio and accepts hot updates to the config, re-rendering with the new config without remounting, so the route and view state survive. Studio components get React Fast Refresh when the CLI runs from source (`pnpm studio:dev`). `build.rolldownOptions.input` names the config and the browser host modules so Vite's dependency scanner finds Monaco's lazy imports before the first request.[^dev]

Each of `apps` is `{ id, title, icon?, load }`: a page under Apps in the nav at `#/app/<id>/<path>`, where `load` imports a module whose default export is the page. The page gets `Preview`, which renders `nodes` through `compose`, or a `composition`, inside a shadow root, plus `runtime`, `theme`, `path` and `navigate`. `appProblems` validates `apps` when the config loads and again on each browser hot update, which keeps the last valid apps. The lazy page is cached by id and `load`'s source with Vite's `?t=` stamps removed, so a config re-run keeps an open app mounted and Fast Refresh updates its module in place. `check` counts apps without calling `load` and validates their icons. Apps render under the Studio's `EuiProvider` without a shadow root, so `assertSingleEui` stops a config that resolves a different `@elastic/eui` or `@emotion/react` from the Studio. A static build bundles every stylesheet the config reaches, lazy apps included, into `assets/app.css`: `.module.css` is a CSS Module, plain `.css` stays global, and Monaco's CSS imports are emptied because `assets/studio.css` carries them.[^apps]

Related: [static PNGs](/studio/concepts/static-png.md), [root and CLI](/studio/entry-points/root.md).

[^config]: Config types
[^compose]: composeExample
[^loader]: Config loader
[^stylesheet]: adoptStylesheet
[^dev]: Dev server Vite config
[^apps]: App host
