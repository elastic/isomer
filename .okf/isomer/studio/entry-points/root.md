---
type: Entry Point
title: Root and CLI
description: '@elastic/isomer-studio exports defineStudioConfig, adoptStylesheet and its types; the isomer-studio binary runs dev, build and check.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/index.ts
tags: [isomer, studio, api, cli]
status: stable
stale_after: 2027-04-07
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/index.ts
    title: Root barrel
  - id: args
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/cli/args.ts
    title: CLI arguments
---

# Definition

The root entry exports `defineStudioConfig`, an identity function that types a config, `adoptStylesheet`, which parses a pack stylesheet once per document and adopts it onto a preview shadow root, and the types `StudioConfig`, `StudioCompose`, `StudioRuntime` and `StudioTheme`, plus `StudioApp`, `StudioAppPage`, `StudioAppProps`, `StudioAppSurface`, `StudioPreviewProps`, `StudioSurfaceProps`, `PreviewZoom` and `RenderPdf` for apps. It is ESM only. The Studio's React components are internal; there is no public React API.[^barrel]

The `isomer-studio` binary takes `dev` (`--port`, default 5179, `0` for a free port; `--open`), `build` (`--out`, default `dist/studio`; `--base`, default `./`, given a trailing slash) and `check` (`--report`, `--format json|junit`, `--png`, `--surfaces`). Every command takes `--config` (default `isomer-studio.config.ts`, `.tsx` or `.js` in `--cwd`), `--cwd` (resolves `--config`, `--out` and `--report`) and `--loader tsx|none`. It exits 0, 1 on a failure, or 2 on bad usage with the usage text.[^args] `build` replaces a non-empty `--out` only when a previous build's `.isomer-studio-build` marker is there, and the dev server answers only requests whose `Host` is loopback.

The app's routes are `#/home` (also an empty or unknown hash, and an unknown app id), `#/dev/<type>/<example>`, `#/docs/<type>/<example>`, `#/docs/gallery` and `#/docs/gallery/<group>` (which scrolls to that authoring group's heading), and `#/app/<id>/<path>`. Home renders on the shell without the nav or the main panel: the header keeps the title and the mark, which returns to Home from anywhere, and on Home shows a docs link in place of the Dev/Docs switch, the search and the color mode. Home's search opens a primitive in the mode last used, Docs on a first visit.

Related: [config contract](/studio/concepts/config-contract.md), [public contract](/studio/reference/public-contract.md).

[^barrel]: Root barrel
[^args]: CLI arguments
