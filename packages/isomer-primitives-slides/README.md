# `@elastic/isomer-primitives-slides`

The in-repo reference primitive pack for Isomer, and the one to copy: slide-deck primitives that render on every surface, a theme with one authoring source per rendered value, a fixed 16:9 frame, and committed output for every example on every surface.

```sh
npm install @elastic/isomer-primitives-slides @elastic/isomer-runtime @elastic/isomer-sdk react react-dom zod
```

```ts
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { slideDeckFrame, slidesPack } from '@elastic/isomer-primitives-slides';

export const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

runtime.surfaces.markdown.render(composition);
runtime.surfaces.svg.render(composition, { theme: 'light' });
```

The pack ships its own style adapter, which the runtime combines with any other styled pack's. `slide` is the host's chosen name for `slideDeckFrame`, not a field the pack fixes.

## Docs

The [Slides pack](https://elastic.github.io/isomer/slides/) docs cover [authoring a primitive](https://elastic.github.io/isomer/slides/primitives), the [pack contract](https://elastic.github.io/isomer/slides/contract), the [document](https://elastic.github.io/isomer/slides/document), the [theme](https://elastic.github.io/isomer/slides/theme), [styling](https://elastic.github.io/isomer/slides/styling), and the [worked example](https://elastic.github.io/isomer/slides/example) with every surface's output.

## License

Elastic License 2.0 (SPDX: `Elastic-2.0`). See [LICENSE.txt](LICENSE.txt).
