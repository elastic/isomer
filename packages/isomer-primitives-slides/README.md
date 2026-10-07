<!-- markdownlint-disable MD033 -->
<p align="center">
  <img src="https://raw.githubusercontent.com/elastic/isomer/main/docs/logo.svg" alt="Isomer" width="96" height="96">
</p>
<h1 align="center">@elastic/isomer-primitives-slides</h1>
<p align="center"><strong>isomer</strong> <i>n.</i> — one formula, many forms; the same composition rendered to every surface.</p>
<p align="center">
  <a href="https://github.com/elastic/isomer/actions/workflows/ci.yml"><img src="https://github.com/elastic/isomer/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/elastic/isomer/blob/main/LICENSE.txt"><img src="https://img.shields.io/badge/License-Elastic%202.0-blue.svg" alt="License: Elastic License 2.0"></a>
</p>
<!-- markdownlint-enable MD033 -->

The in-repo reference primitive pack for Isomer, and the one to copy: slide-deck primitives that render on every surface, a theme with one authoring source per rendered value, a fixed 16:9 frame, and committed output for an example deck.

It is not published to npm. Copy this folder into your own codebase and install what it needs from the registry:

```sh
npm install @elastic/distillate@^0.2.0 @elastic/isomer-runtime @elastic/isomer-sdk react react-dom zod
```

```ts
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { slideDeckFrame, slidesPack } from '@elastic/isomer-primitives-slides';

export const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

runtime.surfaces.markdown.render(composition);
runtime.surfaces.snapshot.render(composition, { theme: 'light' });
```

The pack ships its own style adapter, which the runtime combines with any other styled pack's. `slide` is the host's chosen name for `slideDeckFrame`, not a field the pack fixes.

## Docs

The [Slides pack](https://elastic.github.io/isomer/slides/) docs cover [authoring a primitive](https://elastic.github.io/isomer/slides/primitives), the [pack contract](https://elastic.github.io/isomer/slides/contract), the [document](https://elastic.github.io/isomer/slides/document), the [theme](https://elastic.github.io/isomer/slides/theme), [styling](https://elastic.github.io/isomer/slides/styling), and the [worked example](https://elastic.github.io/isomer/slides/example) with its output.

## License

Elastic License 2.0 (SPDX: `Elastic-2.0`). See [LICENSE.txt](LICENSE.txt).
