---
type: Concept
title: Running without a config
description: With no config, dev, build and check generate one registering every pack the project's entry exports, and the Studio resolves shared packages from the project and its own runtime when the project lacks one, so a cold npx works.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/node/zero_config.ts
tags: [isomer, studio]
status: stable
stale_after: 2027-04-18
sources:
  - id: zero
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/node/zero_config.ts
    title: Generated and init configs
  - id: resolution
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/node/project_resolution.ts
    title: Project resolution rules
  - id: hooks
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/node/resolve_hooks.ts
    title: Node resolve hooks
  - id: consumer
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_studio_consumer.js
    title: Packed consumer check
---

# Definition

`isomer-studio` with no command runs `dev`. When `--cwd` has no `isomer-studio.config.{ts,tsx,mts,js}` and `--config` names none, `dev`, `build` and `check` write `.isomer-studio/isomer-studio.config.mts` (with a `.gitignore` of `*`) and load it. It imports the project's entry, the first existing of `src/index.tsx`, `src/index.ts`, `index.tsx`, `index.ts`, the `package.json` root export, `module` and `main`, and registers every export, or property of a default-exported object, shaped like a `definePrimitivePack` result, with the `package.json` `name` as the title. `init` writes an editable `isomer-studio.config.ts` (`.mts` unless the project is `"type": "module"`) importing those packs by name, and refuses to replace a config.[^zero]

The project is the real directory of the `package.json` nearest the config. Two rules apply in Node (module hooks the binary registers), Vite and esbuild: `react`, `react-dom`, `@elastic/isomer-sdk` and `zod` imported from outside the project resolve from it, and `@elastic/isomer-runtime` and `@elastic/isomer-studio` resolve from the Studio's install when the project lacks them. The Studio stops unless the config resolves React 18.[^resolution][^hooks]

Studio depends on `react` and `react-dom` `^18.2.0` rather than taking them as peers: under `npx`, npm auto-installs the runtime's `>=18 <20` peer as React 19 and then cannot satisfy a Studio peer of `^18.2.0`. The project's React is the one every preview uses. The packed consumer check installs the Studio alone and runs `check`, `build`, `dev` in Chromium and `init` against a pack with only the SDK, React and zod.[^consumer]

Related: [config contract](/studio/concepts/config-contract.md), [root and CLI](/studio/entry-points/root.md).

[^zero]: Generated and init configs
[^resolution]: Project resolution rules
[^hooks]: Node resolve hooks
[^consumer]: Packed consumer check
