---
title: Takumi image backend
description: Rasterizes the svg surface's element and stylesheet to PNG or SVG bytes with Takumi.
url: https://docs-v3-preview.elastic.dev/pr-preview/pr-1/image-takumi
---

# Takumi image backend
`@elastic/isomer-image-takumi` rasterizes the `svg` surface's output with [takumi](https://takumi.kane.tw). PNG or SVG out; nothing else.
```ts
import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';

const takumi = createTakumiImageBackend({ fonts });
const png = await takumi.png(runtime.surfaces.svg.render(composition));
```


## What it is

The `svg` surface returns `{ element, css, width, height }` — the same React tree the DOM gets, paired with the pack's stylesheet and the viewport it was measured for. This package serializes that tree, hands it to takumi's `fromHtml`, and lays it out. No primitive writes an image renderer, and this package holds no opinion about compositions.
`ImageInput` is declared structurally rather than imported, so this package depends on no isomer package — `react` and `react-dom` are its only peers. `SvgRenderResult` from `@elastic/isomer-runtime` satisfies it.

## Rendering a whole runtime call in one step

`renderPng(runtime, composition, backend, options?)` bundles validation, the `svg` surface, and rasterization, returning `{ png, width, height, validation }`. It exists because the `svg` surface discards its own validation findings and knows nothing about image backends, so a host that wants the findings next to the bytes would otherwise validate, render, and rasterize in three calls of its own.
```ts
import { renderPng } from '@elastic/isomer-image-takumi';

const { png, validation } = await renderPng(runtime, composition, takumi, {
  svg: { frame: 'card' },
});
```

The composition is always rendered, even when invalid — `validation` is how a caller finds out, rather than a thrown error. `runtime` and `composition` are declared structurally, the same way `ImageInput` is.

## Fonts

Nothing is registered by default. A pack names font families in its theme, and which files back them is the host's decision, the way the stylesheet is the host's on the React surface — so an unregistered family falls back to takumi's built-in face, visibly.
`@takumi-rs/core` is built with takumi's `woff` and `woff2` features, so a `@fontsource/*` file works as-is with no conversion step:
```ts
const fonts = [
  { name: 'Inter', weight: 700, data: () => readFile(interBold) },
];
```

A `FontLoader` string is a URL takumi fetches on demand, not a filesystem path — `fetch` rejects a bare path and a `file:` URL alike — so a local file goes in as an eager buffer or a lazy `data()`, as above. Registration order is takumi's fallback order.

## Determinism

The raster is byte-stable for the same input, same process, same platform — `backend.test.ts` asserts this directly, and it is what lets a committed PNG be compared byte-for-byte rather than by pixel tolerance. Cross-platform stability (darwin-arm64 producing the same bytes as linux-x64, at a pinned `@takumi-rs/core` and a fixed font set) is the deck example's operating assumption, but CI runs Ubuntu only, so that half of the claim is not independently verified here.

## Status

Published with the other workspace packages at one version. It is a host-side rasterizer: the runtime stays free of native dependencies, and a host that draws images adds this package.