---
navigation_title: The config
description: What an isomer-studio.config.ts exports, how previewExample and compose wrap examples, how apps add pages, and how the Studio loads the config in Node and the browser.
---

# The config

A config file default-exports `defineStudioConfig({ ... })`. `defineStudioConfig` returns its argument; it exists so the object is typed. The runtime exports are `defineStudioConfig` and `adoptStylesheet`. The types are `StudioConfig`, `StudioCompose`, `StudioRuntime`, `StudioTheme`, and, for [apps](#apps), `StudioApp`, `StudioAppPage`, `StudioAppProps`, `StudioAppSurface`, `StudioPreviewProps`, `StudioSurfaceProps`, `PreviewZoom` and `RenderPdf`.

```ts
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { defineStudioConfig } from '@elastic/isomer-studio';

import { previewSlide } from './src/examples/preview_slide';
import { slideDeckFrame, slidesPack, slideStylesheet } from './src/index';

export default defineStudioConfig({
  runtime: createIsomerRuntime({
    packs: [slidesPack],
    frames: { slide: slideDeckFrame },
  }),
  stylesheet: slideStylesheet,
  previewExample: previewSlide,
});
```

| Field                       | Required | What it does                                                                                                                                                                                                                                                                                                  |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runtime`                   | Yes      | The runtime from `createIsomerRuntime`. Its packs are what the Studio lists, and its surfaces are the previews it offers.                                                                                                                                                                                     |
| `title`                     | No       | Replaces the header, the page title, and the `check` report name. Defaults to `Isomer Studio`. Leave it unset to keep the product name; a runtime with more than one pack shows each pack in the nav.                                                                                                         |
| `stylesheet()`              | No       | The CSS the React preview needs. The Studio calls it once and adopts the result into each preview's shadow root.                                                                                                                                                                                              |
| `createReactContext(root)`  | No       | Returns the render context the pack's renderers expect, inside the React preview's shadow root, after `stylesheet` is adopted there. Call `adoptStylesheet(root, css)` for any other CSS. Without it the context is empty, and without it or `stylesheet` the React preview shows the `html` surface instead. |
| `previewExample(node)`      | No       | The composition one node is shown in on its own, such as a slide around it. The Studio adds the theme and puts several nodes in a `view`. See [`previewExample` and `compose`](#previewexample-and-compose).                                                                                                  |
| `compose(nodes, { theme })` | No       | Wraps example nodes in a composition, for full control. Wins over `previewExample`. Defaults to `{ type: 'view', body: nodes, theme }`.                                                                                                                                                                       |
| `apps`                      | No       | Pages that demonstrate the pack, listed in the nav and on Home. See [Apps](#apps).                                                                                                                                                                                                                            |
| `imageFonts`                | No       | A module path, relative to the config, whose default export lists the takumi `FontLoader`s PNGs and PDFs draw text with. See [Image fonts](#image-fonts).                                                                                                                                                     |
| `featured`                  | No       | Primitive types Home features, in order. Without it Home draws six at random on each load. See [Featured primitives](#featured-primitives).                                                                                                                                                                   |

## `previewExample` and `compose`

Examples are nodes, not compositions. Every place the Studio needs a composition, the config's `compose`, or its `previewExample`, builds it: the gallery, the docs pages, the editor's preview, the PNGs a static build prerenders and every example `check` renders. A pack writes the envelope once and every mode agrees on it.

The default fits a pack whose primitives render inside a plain `view`. A pack whose frame requires a particular root says how one node is shown with `previewExample`. The slides frame draws exactly one `slideFrame`, so the slides `previewExample` wraps a lone node in a preview slide, and passes a node that is already a `slideFrame` through unwrapped. `compose` replaces both when a pack needs to shape several nodes too.

`compose` receives the theme the Studio is showing, `light` or `dark`, and puts it on the composition; with `previewExample`, the Studio does. That theme is the app's color mode, so previews always match the chrome around them. Light and dark are then different compositions, which is how a static build tells their PNGs apart.

## Featured primitives

Home opens with a strip of featured primitives, each with a link to its Reference page and to the Workbench. `featured` names them by type, in the order they appear:

```ts
export default defineStudioConfig({
  runtime,
  featured: ['titleSlide', 'slideBulletList', 'slideSplitLayout'],
});
```

Without `featured`, Home draws six primitives at random each time it loads, so a pack with no opinion still shows its range. `dev`, `build` and `check` reject a `featured` entry the runtime has no primitive for, or one listed twice, and name it. A browser hot update with an invalid entry reports it and skips it.

## Apps

An app is a whole page of the Studio, such as a deck viewer. Each one gets a top-level nav entry beside Gallery, a tile on Home, and a route at `#/app/<id>/`.

```ts
export default defineStudioConfig({
  runtime,
  apps: [
    {
      id: 'decks',
      title: 'Decks',
      description: 'Whole presentations, played one slide at a time.',
      load: () => import('./studio/decks_app'),
    },
  ],
});
```

| Field         | Required | What it does                                                                                                                        |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | Yes      | The route segment, matching `/^[a-z][a-z0-9-]*$/` and unique within the config.                                                     |
| `title`       | Yes      | The nav entry, the header's label while the app is open, and the Home tile's title.                                                 |
| `description` | No       | One line under the title on the Home tile and in Home's Loaded panel.                                                               |
| `icon`        | No       | A `PrimitiveIcon`, held to the same rules as a primitive's icon by `check`. Without one, the nav and Home show the title's initial. |
| `load`        | Yes      | Imports a module whose default export is the app's page.                                                                            |
| `pages`       | No       | Nav rows under the app's own row. See [Pages](#pages).                                                                              |

`dev`, `build` and `check` reject invalid apps and name each one. A hot update with invalid apps keeps the last valid ones and shows why. `check` counts the apps but never calls `load`.

### Pages

An app can list its own pages in the nav, such as one per deck. The nav shows them without loading the app, so a config builds them from data it already imports.

```ts
pages: [
  { path: 'isomer', title: 'Isomer', section: 'Decks' },
  { path: 'distillate', title: 'Distillate', section: 'Decks' },
],
```

| Field     | Required | What it does                                                                                                       |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `path`    | Yes      | Opens `#/app/<id>/<path>`. One or more non-empty segments, with no leading or trailing `/`, unique within the app. |
| `title`   | Yes      | The row's label. The nav filter matches it.                                                                        |
| `section` | No       | Pages with the same `section` are listed under it, in order of first appearance. Pages without one come first.     |

A page is current when the app's `path` equals the page's `path` or starts with it plus `/`. The longest match wins, so `isomer/3` keeps a page at `isomer/3` current over one at `isomer`. While a page is current, the app's own row is not. The collapsed rail shows only the app's row.

`dev`, `build` and `check` reject invalid pages as they do invalid apps, naming the app and the page's index.

### The page

The page is a React component, and the Studio hands it `StudioAppProps`:

| Prop             | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Preview`        | Renders pack output inside a shadow root, isolated from the app's styles and the Studio's. Pass `nodes`, which go through the config's `compose` or `previewExample` at the current theme, or a finished `composition`. `zoom` defaults to `fit`, and `maxHeight` caps a fitted preview's height. `heading={false}` leaves out the composition's leading title, as a slide shown on its own wants. `enhancements` are enhancement ids the surface renders with, such as the slides pack's `SLIDE_BUILDS`. `onCommit(root)` runs with the shadow root after each render commits, for a host step such as `showSlideBuild`. Without `createReactContext` or `stylesheet`, it shows the `html` surface, which gets `enhancements` but has no shadow root, so `onCommit` is never called. |
| `Surface`        | Shows a `composition` on one of `surfaces`, as the Studio's own previews do: `surface` picks it, `view` is `render` or `source`, and `zoom` and `heading` work as on `Preview`. `png` is drawn by the host.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `surfaces`       | The `{ id, label }` surfaces `Surface` can show, in the Studio's order: the runtime's, then `png` when the host rasterizes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `renderPdf`      | `renderPdf(compositions, { title })` resolves to a PDF `Blob`, a page per composition, drawn as PNGs are. Only `dev` has one; it is `undefined` in a static build.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `runtime`        | The config's runtime.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `theme`          | `light` or `dark`, following the Studio's color mode.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `path`           | Everything after `#/app/<id>/`, slashes included, with each segment percent-decoded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `navigate(path)` | Moves to another `path` within the app, adding a history entry. Each segment is percent-encoded in the hash, so `path` reads back the same after a reload.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

Import only types from `@elastic/isomer-studio` in an app module. The Studio hands the page everything it needs as props.

The page stays mounted when `path`, the theme or the config changes. When the config changes, the Studio calls the new `load` and remounts the page only if the module's default export is a different component. Edits to the app module update it in place through React Fast Refresh, as long as the module exports only components. A module that exports anything else re-runs the config instead.

`load` runs only in the browser. Node imports the config for `check` and `build`, but never calls `load`, so code that must stay off the server belongs behind it.

### EUI

Apps render under the Studio's own `EuiProvider`. Use EUI components directly, and nest `EuiThemeProvider` to change the theme for part of the page. Never mount a second `EuiProvider`.

EUI's theme and Emotion's cache reach the app only when it imports the same copies the Studio does. When a config with apps resolves `@elastic/eui` or `@emotion/react`, it must resolve the Studio's copy, and `dev`, `build` and `check` stop when it does not. A config without apps is not checked. Install the Studio's versions of EUI and its peers beside the config: `@elastic/eui`, `@elastic/eui-theme-borealis`, `@elastic/datemath`, `@emotion/react`, `@emotion/css` and `moment`.

Apps are not inside a shadow root, because EUI's popovers, flyouts, modals and toasts portal to `document.body`.

### CSS

| Form                        | Scope  | Notes                                                                                                                                                                                                         |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Emotion's `css`             | Scoped | Needs `@emotion/react` as the JSX import source: add `/** @jsxImportSource @emotion/react */` to the file, or set `jsxImportSource` in a `tsconfig.json` for the app's folder.                                |
| CSS Modules, `*.module.css` | Scoped | TypeScript needs a declaration such as `declare module '*.module.css' { const classes: Readonly<Record<string, string>>; export default classes; }`.                                                          |
| Plain `.css`                | Global | Scope its selectors under the app's root element. `url()`s to fonts (`woff2`, `woff`, `ttf`, `otf`, `eot`) and images (`png`, `jpg`, `jpeg`, `gif`, `webp`, `avif`, `svg`, `ico`) resolve under any `--base`. |

In `dev`, a stylesheet loads when the app first opens. A static build bundles every stylesheet the config imports into `assets/app.css`, which loads with the page.

## Surfaces a runtime may lack

The Studio offers the surfaces `runtime.surfaces` has. A runtime without a frame has no `snapshot` surface, so it gets no Snapshot or PNG previews, a static build prerenders no PNGs, and `check` reports those checks as skipped.

## Image fonts

PNGs and PDFs are drawn by takumi in Node, which knows no fonts but its own. `imageFonts` names a module that default-exports the faces to draw with, as `FontLoader[]` from `@elastic/isomer-image-takumi`:

```ts
// studio/image_fonts.ts
export { slideFonts as default } from '../src/examples/fonts';
```

Node imports it the way it imports the config, the first time it draws, and the browser never does, so it may read font files from disk. `dev`, `build` and `check --png` all draw with it. Without it, PNGs fall back to takumi's built-in face and a PDF cannot draw text.

## How the config loads

The config runs in two places: in Node, for `check` and for the dev server's PNGs, and in the browser, bundled into the app.

**In Node**, `check` and `build` import the config with `tsx`, which compiles TypeScript and JSX as it loads and leaves resolution to Node. The config, its pack, React and the runtime all resolve from the config's own directory, so they come from the pack's `node_modules`. `tsx` applies the `tsconfig.json` nearest the config, so the pack's `jsx` setting holds in both ES module and CommonJS projects.

`dev` loads the config through Vite's server-side module graph instead, with the same nearest-`tsconfig.json` JSX settings. Packages in `node_modules` load once through Node, and an edit re-runs only the files that changed and the modules that import them.

`--loader none` skips both and imports the config with a plain `import()`. Use it for a JavaScript config, or to bring another loader through `NODE_OPTIONS=--import ...`. Node caches that import, so under `dev` the browser picks up edits but PNGs keep the config and pack as they were at startup; restart `dev` to refresh them.

**In the browser**, `build` bundles the config with esbuild and `dev` serves it through Vite. `react`, `react-dom` and their subpaths resolve as if imported from the config, so the Studio's own components, Emotion and the pack share one React, and each package's browser build is the one loaded.

**Run with `npx`**, the Studio sits in npm's cache rather than the pack's `node_modules`. Two rules make that work in Node, Vite and esbuild alike:

- `react`, `react-dom`, `@elastic/isomer-sdk` and `zod`, imported from outside the project, resolve from the project, so the runtime and the pack share them.
- `@elastic/isomer-runtime` and `@elastic/isomer-studio`, when the project does not have them, resolve from the Studio's install. A config can import both without installing either.

The Studio depends on the SDK and runtime at its own version rather than as peers, so a cached `npx @elastic/isomer-studio@next` upgrades all three together when `next` moves.

The project is the directory of the `package.json` nearest the config. In Node the rules cover `import` and `require`, which a `.ts` config in a project that is not `"type": "module"` loads through.

## One React

The Studio, the pack and the runtime must use one copy of React, and it must be React 18, which EUI requires. Before loading the config, the Studio resolves `react` from the config, stops when it is not 18, then resolves `react` from the `@elastic/isomer-runtime` the config sees, and stops when they differ:

```text
The Studio config and @elastic/isomer-runtime resolve different copies of React:
  config:  /work/pack/node_modules/react
  runtime: /work/pack/node_modules/@elastic/isomer-runtime/node_modules/react
Install one React for both, for example by deduplicating your lockfile.
```
