---
type: Reference
title: Public contract
description: Published, ESM only, a bin plus defineStudioConfig and adoptStylesheet, React 18, SDK and runtime as dependencies, zod peer, EUI and Monaco bundled as dependencies.
tags: [isomer, studio, contract]
status: stable
stale_after: 2027-04-07
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/package.json
    title: Package metadata
---

# Definition

`@elastic/isomer-studio` is a published CLI package, not a React library; its requirements, install and Workbench behavior are documented in the [Studio docs](https://github.com/elastic/isomer/blob/main/packages/isomer-studio/docs/index.md#requirements) and [Commands](https://github.com/elastic/isomer/blob/main/packages/isomer-studio/docs/commands.md#comparing-outputs).

- Published to npm by the release workflow, at the same version as the other published packages. Source available under the Elastic License 2.0 (SPDX: `Elastic-2.0`).[^package]
- One ESM-only entry, `.`, and the `isomer-studio` bin, a shim that imports `dist/cli.js`. The tarball carries `bin`, `dist` (including the prebuilt `dist/app/` assets), `docs`, `README.md`, `LICENSE.txt`, `NOTICE.txt` and `THIRD_PARTY_LICENSES.md`.
- Peer: `zod`.
- Dependencies carry what the app and CLI use: `react` and `react-dom` `^18.2.0` (so a cold `npx` installs a React 18; see [init and npx](/studio/concepts/init.md)), EUI and its Borealis theme, Emotion, `monaco-editor`, `slack-blocks-to-jsx`, `prettier`, `esbuild`, `esbuild-wasm` (pinned to match its `.wasm`), `tsx`, `vite` and `@vitejs/plugin-react` for `dev`, and `@elastic/isomer-image-takumi`.
- HTML renders in a shadow root with its stylesheet; previewed links open in a new tab and forms do not submit, so a preview never navigates Studio.

The output pane blends the recessed background with the neutral border color, separating the space between cards from their plain dotted canvases.

Toolbars retain their control padding while columns abut EUI's overlapping border resizer.

Related: [root and CLI](/studio/entry-points/root.md).

[^package]: Package metadata
