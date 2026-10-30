---
type: Concept
title: Config contract
description: A Studio config supplies a runtime, and optionally a title, stylesheet, createReactContext, previewExample, compose, apps, featured and imageFonts; the CLI supplies JSX compilation and PNGs per mode.
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

A Studio config default-exports `defineStudioConfig` with a `runtime` and optional fields for styling, composing examples, apps, featured primitives and image fonts; each field, and how the config loads in Node and the browser, is documented in [The config](https://github.com/elastic/isomer/blob/main/packages/isomer-studio/docs/config.md).

`stylesheet()` is called once per config and its CSS adopted into each React preview's shadow root before `createReactContext(root)`, which returns the render context (empty without it); with neither, the React preview shows the `html` surface. `reactContextOf` combines the two. `adoptStylesheet(root, css)` parses CSS once per document and adopts the sheet onto each preview's shadow root, appending a `style` element where constructable stylesheets are missing.[^stylesheet] `compose(nodes, { theme })` wraps example nodes in a composition and defaults to `{ type: 'view', body: nodes, theme }`. Without it, `previewExample(node)` shows a lone node, the Studio adding the theme and putting several nodes in a `view`; `composeOf` resolves the two, `compose` winning.

Groups stay in pack order, each sorted by label, with ungrouped primitives last under Uncategorized (`UNCATEGORIZED_GROUP_TITLE`). Groups collapse, closed ones are remembered in `localStorage` (keyed by pack and group when there is more than one pack), and a filter forces every matching group open.

`composeExample` is the one place a composition is built from examples: the gallery, Reference pages, Workbench, static PNG prerendering and `check` all call it, so a pack whose frame needs a particular root (the slides frame needs one `slideFrame`, which its `previewExample` adds) writes the envelope once.[^compose]

For `check` and `build`, the config loads once in Node through `createStudioImporter`: one `tsx` namespace, its CommonJS and ESM hooks registered together with the nearest `tsconfig.json`, also passed as `TSX_TSCONFIG_PATH` so CommonJS projects compile JSX the same way. `imageFonts` loads through the same namespace, since each `tsx` namespace is its own module graph and a package both reach (such as `@elastic/distillate`, which warns on a second copy) would otherwise load twice. `dev` loads it through a Vite module runner on the server-side environment instead: on a change that reaches the config, the `hotUpdate` hook invalidates the changed modules and their importers in the runner, re-imports the config, and only then lets the browser update. `react-dom/server` comes from the config's React through `createRequire`. In the static build's bundle, an esbuild plugin re-resolves `react`, `react-dom` and their subpaths from the config's directory, keeping each package's `browser` mapping; `dev` gets the same with Vite's `resolve.dedupe` rooted at the config's directory.[^loader]

In `dev`, the page loads a virtual entry that mounts the Studio and accepts hot updates to the config, re-rendering with the new config without remounting, so the route and view state survive. Studio components get React Fast Refresh when the CLI runs from source (`pnpm studio:dev`). `build.rolldownOptions.input` names the config and the browser host modules so Vite's dependency scanner finds Monaco's lazy imports before the first request.[^dev]

`featured` names primitive types Home features, in order; without it Home draws `FEATURED_COUNT` (six) at random on each load through `pickFeatured`. `featuredProblems` rejects an entry the runtime lacks, a repeated one, or a non-string when the config loads (an error naming the config) and on each browser hot update (reported and skipped).[^config]

`appProblems` validates `apps` (`description`, when given, must be a non-empty string), and each page's `path`, `title` and `section` by app and page index, when the config loads and again on each browser hot update, which keeps the last valid apps. Apps render under the Studio's `EuiProvider` without a shadow root, so `assertSingleEui` stops a config with apps that resolves a different `@elastic/eui` or `@emotion/react` from the Studio; it runs in `studioConfigFrom`, after `apps` validates. A static build bundles every stylesheet the config reaches, lazy apps included, into `assets/app.css`: `.module.css` is a CSS Module, plain `.css` stays global, and Monaco's CSS imports are emptied because `assets/studio.css` carries them.[^apps]

The dev server answers `POST /pdf` with `{ title?, compositions }`, up to 8 MiB, by `renderPdf` from `@elastic/isomer-image-takumi`.[^apps]

Related: [static PNGs](/studio/concepts/static-png.md), [root and CLI](/studio/entry-points/root.md).

[^config]: Config types
[^compose]: composeExample
[^loader]: Config loader
[^stylesheet]: adoptStylesheet
[^dev]: Dev server Vite config
[^apps]: App host
