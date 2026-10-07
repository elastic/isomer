<!-- markdownlint-disable MD033 -->
<p align="center">
  <img src="https://raw.githubusercontent.com/elastic/isomer/main/docs/logo.svg" alt="Isomer" width="96" height="96">
</p>
<h1 align="center">@elastic/isomer-image-takumi</h1>
<p align="center"><strong>isomer</strong> <i>n.</i> — one formula, many forms; the same composition rendered to every surface.</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@elastic/isomer-image-takumi"><img src="https://img.shields.io/npm/v/@elastic/isomer-image-takumi.svg" alt="npm version"></a>
  <a href="https://github.com/elastic/isomer/actions/workflows/ci.yml"><img src="https://github.com/elastic/isomer/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/elastic/isomer/blob/main/LICENSE.txt"><img src="https://img.shields.io/badge/License-Elastic%202.0-blue.svg" alt="License: Elastic License 2.0"></a>
</p>
<!-- markdownlint-enable MD033 -->

Rasterizes the `svg` surface's output with [takumi](https://takumi.kane.tw): PNG, SVG, or PDF out, and a measured layout for the SDK's `checkLayout`.

```sh
npm install @elastic/isomer-image-takumi react react-dom
```

```ts
import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';

const takumi = createTakumiImageBackend({ fonts });
const png = await takumi.png(runtime.surfaces.svg.render(composition));
const pdf = await takumi.pdf(runtime.surfaces.svg.renderPages(deck));
```

`renderPng` and `renderPdf` wrap validation, the `svg` surface, and the backend in one call and return the findings beside the bytes. A host-side rasterizer: it depends on no Isomer package, `react` and `react-dom` are its only peers, and it is the one published package that pulls a native dependency. Docs: [Takumi image backend](https://elastic.github.io/isomer/image-takumi/).

## License

Elastic License 2.0 (SPDX: `Elastic-2.0`). See [LICENSE.txt](LICENSE.txt).
