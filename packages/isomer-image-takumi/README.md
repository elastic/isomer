# `@elastic/isomer-image-takumi`

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
