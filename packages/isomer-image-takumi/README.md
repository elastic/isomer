# `@elastic/isomer-image-takumi`

Rasterizes the `svg` surface's output with [takumi](https://takumi.kane.tw). PNG or SVG out; nothing else.

```ts
import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';

const takumi = createTakumiImageBackend({ fonts });
const png = await takumi.png(runtime.surfaces.svg.render(composition));
```

A host-side rasterizer: it depends on no Isomer package and is the one workspace package that pulls a native dependency. Docs: [Takumi image backend](https://elastic.github.io/isomer/image-takumi/).

## License

Elastic License 2.0 (SPDX: `Elastic-2.0`). See [LICENSE.txt](LICENSE.txt).
