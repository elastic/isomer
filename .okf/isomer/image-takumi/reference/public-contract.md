---
type: Reference
title: Public contract
description: Published, dual-format, no isomer dependencies, takumi core and helpers pinned at 2.14.0 and takumi-pdf at 0.15.0.
tags: [isomer, image-takumi, contract]
status: stable
stale_after: 2027-03-18
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/package.json
    title: Package metadata
---

# Definition

- Source available under the Elastic License 2.0 (SPDX: `Elastic-2.0`). Published with the workspace at one version, as a host-side rasterizer; the release script passes `--access public`, since the manifest sets no `publishConfig`. Depends on `@takumi-rs/core` and `@takumi-rs/helpers` 2.14.0 (native, with a prebuilt binary per platform as the core's optional dependencies) and `takumi-pdf` 0.15.0 (WebAssembly, imported on the first PDF). Peers: `react`, `react-dom` `>=18 <20`. No isomer package dependency.[^package]
- One entry point with `import` and `require` conditions: ESM under `dist/`, CommonJS under `dist/cjs/`. The tarball carries `dist`, `LICENSE.txt`, `NOTICE.txt`, and `THIRD_PARTY_LICENSES.md`. The manifest declares no `engines`; the native core decides which platforms it runs on.

Related: [raster](/image-takumi/concepts/raster.md), [root](/image-takumi/entry-points/root.md).

[^package]: Package metadata
