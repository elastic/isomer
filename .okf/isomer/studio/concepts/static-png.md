---
type: Concept
title: Static PNGs
description: isomer-studio build prerenders every example in both themes, keyed by the SHA-256 of the composition's canonical JSON.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/model/composition_key.ts
tags: [isomer, studio]
status: stable
stale_after: 2027-04-07
sources:
  - id: key
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/model/composition_key.ts
    title: compositionKey
  - id: manifest
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/model/png_manifest.ts
    title: PNG manifest
  - id: host
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/browser/static_host.ts
    title: Static host
---

# Definition

`compositionKey(composition)` is the hex SHA-256, through `crypto.subtle`, of JSON with sorted keys, no whitespace and `undefined` properties dropped, so Node and the browser agree and key order does not matter. The theme is part of the composition, so light and dark differ.[^key]

`build` composes every example in both themes, rasterizes each through the runtime's `snapshot` surface and takumi at scale 2, and writes `png/<key>.png` plus `png/manifest.json` (`{ version: 1, entries }`, each entry `{ file, primitive, example, theme }`). An example that fails to compose or rasterize is reported and left out.[^manifest]

In a static site, `rasterizePng` computes the key and fetches the file; a miss rejects with `PngUnavailableError`, identified by `name`, which the PNG panel shows as "PNG previews of edited compositions need `isomer-studio dev`." JSX compiles with `esbuild-wasm`, loaded on first use from `assets/esbuild.wasm` against the page's `<base href>`.[^host]

Related: [config contract](/studio/concepts/config-contract.md).

[^key]: compositionKey
[^manifest]: PNG manifest
[^host]: Static host
