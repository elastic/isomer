---
type: Concept
title: Init and npx
description: dev, build and check need a config and point at init, which writes one registering every pack the package's entry exports; the Studio resolves shared packages from the project and its own runtime when the project lacks one, so npx works without an install.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/node/init_config.ts
tags: [isomer, studio]
status: stable
stale_after: 2027-04-18
sources:
  - id: init
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/node/init_config.ts
    title: init
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

`isomer-studio` with no command runs `dev`. `dev`, `build` and `check` stop without `--config` or an `isomer-studio.config.{ts,tsx,js}` in `--cwd`, saying to run `npx @elastic/isomer-studio init`. `init` writes `isomer-studio.config.ts` beside a `tsconfig.json` and `isomer-studio.config.js` otherwise, default-exporting `defineStudioConfig({ title, runtime })`. It imports the package's entry (the first existing of `src/index` and `index` as `.tsx`, `.ts`, `.jsx` or `.js`, then the `package.json` root export, following `import`, `module`, `require`, `node` and `default` conditions at any depth, `module` and `main`) and registers each distinct export, or property of a default-exported object, shaped like a `definePrimitivePack` result, once, renaming a binding the config's helper imports take, titled with the `package.json` `name`. It refuses to replace a config or to write one for an entry with no pack.[^init]

The project is the real directory of the `package.json` nearest the config. Two rules apply in Node, Vite and esbuild: `react`, `react-dom`, `@elastic/isomer-sdk` and `zod` imported from outside the project resolve from it, and `@elastic/isomer-runtime` and `@elastic/isomer-studio` resolve from the Studio's install when the project lacks them. In Node the binary registers them with `module.registerHooks` (Node 22.15 and later, covering `import` and `require`), or with `module.register` for `import` and a wrapped CommonJS resolver for `require`; a `require` from another parent resolves through `createRequire`, and a `require` of the ESM-only Studio, installed or not, takes the running Studio's `import` entry. The Studio stops unless the config resolves React 18.[^resolution][^hooks]

The Studio depends on `react` and `react-dom` `^18.2.0` rather than taking them as peers: under `npx`, npm auto-installs the runtime's `>=18 <20` peer as React 19 and then cannot satisfy a Studio peer of `^18.2.0`. The project's React is the one every preview uses. The packed consumer check installs the Studio alone and, in an ES module pack, a JavaScript pack and a Kibana-shaped CommonJS package with only the SDK, React and zod, and a Kibana-shaped package that installs the Studio and runs its own, runs `check` without a config, then `init`, `check`, `build` and `dev` in Chromium, with a pack renderer that calls a hook.[^consumer]

Related: [config contract](/studio/concepts/config-contract.md), [root and CLI](/studio/entry-points/root.md).

[^init]: init
[^resolution]: Project resolution rules
[^hooks]: Node resolve hooks
[^consumer]: Packed consumer check
