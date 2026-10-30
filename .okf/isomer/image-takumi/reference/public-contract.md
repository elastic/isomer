---
type: Reference
title: Public contract
description: Published, dual-format, no isomer dependencies, takumi core and helpers pinned at 2.18.1 and takumi-pdf at 0.18.3.
tags: [isomer, image-takumi, contract]
status: stable
stale_after: 2027-03-18
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/package.json
    title: Package metadata
---

# Definition

A published, host-side rasterizer with no isomer package dependency. See the [package docs](https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/docs/index.md#status).

- Published with the workspace at one version, as a host-side rasterizer; the release script passes `--access public`, since the manifest sets no `publishConfig`. Depends on `@takumi-rs/core` and `@takumi-rs/helpers` 2.18.1 (native, with a prebuilt binary per platform as the core's optional dependencies) and `takumi-pdf` 0.18.3 (WebAssembly, loaded by its public specifier in the PDF worker on the first PDF; `src/pdf_worker.test.ts` fails if its `node` export condition stops reaching a Node entry). Peers: `react`, `react-dom` `>=18 <20`.[^package]
- One entry point with `import` and `require` conditions: ESM under `dist/`, CommonJS under `dist/cjs/`. Each build carries the PDF worker module (`pdf_worker.js`) and `pdf_worker_file.cjs`, which starts the CommonJS build's from either build; `isomer.packedFiles` makes `pnpm check:pack-contents` require all four. The tarball carries `dist`, `LICENSE.txt`, `NOTICE.txt`, and `THIRD_PARTY_LICENSES.md`. The manifest declares no `engines`; the native core decides which platforms it runs on.

Related: [raster](/image-takumi/concepts/raster.md), [root](/image-takumi/entry-points/root.md).

[^package]: Package metadata
