<!-- markdownlint-disable MD033 -->
<p align="center">
  <img src="https://raw.githubusercontent.com/elastic/isomer/main/docs/logo.svg" alt="Isomer" width="96" height="96">
</p>
<h1 align="center">@elastic/isomer-runtime</h1>
<p align="center"><strong>isomer</strong> <i>n.</i> — one formula, many forms; the same composition rendered to every surface.</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@elastic/isomer-runtime"><img src="https://img.shields.io/npm/v/@elastic/isomer-runtime.svg" alt="npm version"></a>
  <a href="https://github.com/elastic/isomer/actions/workflows/ci.yml"><img src="https://github.com/elastic/isomer/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/elastic/isomer/blob/main/LICENSE.txt"><img src="https://img.shields.io/badge/License-Elastic%202.0-blue.svg" alt="License: Elastic License 2.0"></a>
</p>
<!-- markdownlint-enable MD033 -->

The assembly layer of Isomer. It takes primitive packs and frames as values and builds a working runtime from them: a dispatcher, a composition validator and parser, a view registry, one render surface per output format, and the authoring payload a host hands an agent.

It renders nothing itself. Primitives, renderers, and themes come from packs; the composition schema, dispatcher, and envelopes come from `@elastic/isomer-sdk`; data, authorization, and delivery stay with the host.

```sh
npm install @elastic/isomer-runtime @elastic/isomer-sdk react react-dom zod
```

```ts
import { createIsomerRuntime } from '@elastic/isomer-runtime';

export const runtime = createIsomerRuntime({
  packs: [componentsPack, chartsPack],
  frames: { card: cardFrame },
  styleAdapter: htmlStyleAdapter,
});

runtime.validate(composition);
runtime.surfaces.text.render(composition);
runtime.surfaces.html.render(composition, { theme: 'auto', fluid: true });
runtime.surfaces.slack.render(composition, { collectAssets: true });
```

`packs` is required. `@elastic/isomer-sdk` is a dependency pinned to the same version, so the two install together. `zod`, `react`, and `react-dom` (`>=18 <20`) are peers — required, because the root entry always constructs the `react` and `html` surfaces, and `html` loads `react-dom/server`. One entry point, ESM and CommonJS, no Node built-ins; on Node it needs 22.13.0 or later.

## Docs

The full set is on the [docs site](https://elastic.github.io/isomer/runtime/).

| Page | What it covers |
| --- | --- |
| [Overview](https://elastic.github.io/isomer/runtime/) | What the package is, and when a host needs it |
| [Quick start](https://elastic.github.io/isomer/runtime/quick-start) | A working host — one composition, six channels |
| [Runtime](https://elastic.github.io/isomer/runtime/runtime) | `createIsomerRuntime`, its options, and what it refuses |
| [Packs](https://elastic.github.io/isomer/runtime/packs) | The vocabulary, and how packs compose |
| [Frame](https://elastic.github.io/isomer/runtime/frame) | The document an image is drawn as |
| [Surfaces](https://elastic.github.io/isomer/runtime/surfaces) | The six render targets and their validation postures |
| [Embedding](https://elastic.github.io/isomer/runtime/embedding) | Isolating a rendered composition's CSS inside a host page |
| [View registry](https://elastic.github.io/isomer/runtime/view-registry) | Product-owned views, requested by id |
| [Authoring context](https://elastic.github.io/isomer/runtime/authoring-context) | What an agent is handed, and how its output comes back |
| [Renderer overrides](https://elastic.github.io/isomer/runtime/renderer-overrides) | Replacing one renderer without forking a pack |
| [API reference](https://elastic.github.io/isomer/runtime/api) | Every export, option, result, and error |

## License

Source available under the Elastic License 2.0 (SPDX: `Elastic-2.0`). See [LICENSE.txt](LICENSE.txt).
