---
type: Reference
title: Public contract
description: Published, ESM only, a bin plus defineStudioConfig and adoptStylesheet, React 18 peers, EUI and Monaco bundled as dependencies.
tags: [isomer, studio, contract]
status: stable
stale_after: 2027-04-07
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/package.json
    title: Package metadata
---

# Definition

- Source available under the Elastic License 2.0 (SPDX: `Elastic-2.0`). Published with the workspace at one version, with `publishConfig.access` `public`. Node `>=22.13.0`.[^package]
- One ESM-only entry, `.`, and the `isomer-studio` bin, a shim that imports `dist/cli.js`. The tarball carries `bin`, `dist` (including the prebuilt `dist/app/` assets), `docs`, `README.md`, `LICENSE.txt`, `NOTICE.txt` and `THIRD_PARTY_LICENSES.md`.
- Peers: `@elastic/isomer-runtime`, `@elastic/isomer-sdk`, `react` and `react-dom` `^18.2.0`, `zod`. React stays at 18 until EUI's peer range allows 19.
- Dependencies carry what the app and CLI use: EUI 123.0.0 and its Borealis theme, Emotion, `monaco-editor`, `slack-blocks-to-jsx`, `prettier`, `esbuild`, `esbuild-wasm` (pinned to match its `.wasm`), `tsx`, and `@elastic/isomer-image-takumi`.

Related: [root and CLI](/studio/entry-points/root.md).

[^package]: Package metadata
