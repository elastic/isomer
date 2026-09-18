# `@elastic/isomer-runtime`

The assembly layer of Isomer. It takes primitive packs and frames as values and builds a working runtime from them: a dispatcher, a composition validator and parser, a view registry, one render surface per output format, and the authoring payload a host hands an agent.

It renders nothing itself. Primitives, renderers, and themes come from packs; the composition schema, dispatcher, and envelopes come from `@elastic/isomer-sdk`; data, authorization, and delivery stay with the host.

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

`packs` is required. `@elastic/isomer-sdk` is a workspace dependency. `zod`, `react`, and `react-dom` (`>=18 <20`) are peers — required, because the root entry always constructs the `react` and `html` surfaces, and `html` loads `react-dom/server`. No Node built-ins, one entry point.

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
