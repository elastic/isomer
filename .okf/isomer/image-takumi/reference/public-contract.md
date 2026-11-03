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

- Published with the workspace at one version, as a host-side rasterizer; the release script passes `--access public`, since the manifest sets no `publishConfig`. Depends on `@takumi-rs/core` and `@takumi-rs/helpers` 2.18.1 (native, with a prebuilt binary per platform as the core's optional dependencies) and `takumi-pdf` 0.18.3 (WebAssembly, loaded by its public specifier in the PDF worker on the first PDF; `src/pdf_worker.test.ts` fails if its `node` export condition stops reaching a Node entry). No peer dependencies: it reads the `snapshot` surface's HTML and CSS, never React; `react` and `react-dom` are dev dependencies for its tests.[^package]
- One entry point with `import` and `require` conditions: ESM for bundlers under `lib/esm/`, CommonJS under `lib/cjs/`. Each build carries `pdf_worker_file.cjs`, which locates the CommonJS build's PDF worker module (`lib/cjs/pdf_worker.js`), the one Node can start; `isomer.packedFiles` makes `pnpm check:pack-contents` require all three. The tarball carries `lib`, `LICENSE.txt`, `NOTICE.txt`, and `THIRD_PARTY_LICENSES.md`. The manifest declares no `engines`; the native core decides which platforms it runs on.

Related: [raster](/image-takumi/concepts/raster.md), [root](/image-takumi/entry-points/root.md).

[^package]: Package metadata
