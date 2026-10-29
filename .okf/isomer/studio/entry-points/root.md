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

The `isomer-studio` binary runs `init`, `dev`, `build` and `check`, whose flags and exit codes are documented in [Commands](https://github.com/elastic/isomer/blob/main/packages/isomer-studio/docs/commands.md); the root entry exports `defineStudioConfig`, `adoptStylesheet` and the config and app types, documented in [The config](https://github.com/elastic/isomer/blob/main/packages/isomer-studio/docs/config.md). It is ESM only.[^barrel]

`build` replaces a non-empty `--out` only when a previous build's `.isomer-studio-build` marker is there, and the dev server answers only requests whose `Host` is loopback.

The interface calls the primitive learning area **Reference** and the composition editor **Workbench**. Their stable routes remain `#/docs/<type>/<example>` and `#/dev/<type>/<example>`; `#/docs/gallery`, `#/docs/gallery/<group>` (which scrolls to that authoring group's heading), `#/home` (also an empty or unknown hash, and an unknown app id), and `#/app/<id>/<path>` are unchanged. Home renders on the shell without the nav or the main panel: the header keeps the title and the mark, which returns to Home from anywhere, and on Home shows a docs link in place of the Workbench/Reference switch, the search and the color mode. Home's search opens a primitive in the mode last used, Reference on a first visit.

Related: [config contract](/studio/concepts/config-contract.md), [public contract](/studio/reference/public-contract.md).

[^barrel]: Root barrel
