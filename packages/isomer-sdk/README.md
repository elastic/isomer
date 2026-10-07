<!-- markdownlint-disable MD033 -->
<p align="center">
  <img src="https://raw.githubusercontent.com/elastic/isomer/main/docs/logo.svg" alt="Isomer" width="96" height="96">
</p>
<h1 align="center">@elastic/isomer-sdk</h1>
<p align="center"><strong>isomer</strong> <i>n.</i> — one formula, many forms; the same composition rendered to every surface.</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@elastic/isomer-sdk"><img src="https://img.shields.io/npm/v/@elastic/isomer-sdk.svg" alt="npm version"></a>
  <a href="https://github.com/elastic/isomer/actions/workflows/ci.yml"><img src="https://github.com/elastic/isomer/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/elastic/isomer/blob/main/LICENSE.txt"><img src="https://img.shields.io/badge/License-Elastic%202.0-blue.svg" alt="License: Elastic License 2.0"></a>
</p>
<!-- markdownlint-enable MD033 -->

The contracts every other Isomer package is written against: what a primitive is, what a pack is, the `Composition` schema, the validator and parser, the dispatcher, the envelopes for text, Markdown, Slack, and HTML, the URL trust policy, the authoring front ends, and the pack conformance harness. `@elastic/isomer-runtime` assembles packs into complete render surfaces; hosts own data, authorization, routing, and side effects.

```sh
npm install @elastic/isomer-sdk react zod
```

A primitive is its schema, the copy an agent reads, examples, and one renderer per surface. A pack is a list of primitives.

```tsx
import { definePrimitive, definePrimitivePack, requiredString, z } from '@elastic/isomer-sdk';

const kpi = definePrimitive({
  type: 'kpi',
  schema: z.object({ type: z.literal('kpi'), label: requiredString(), value: requiredString() }),
  catalog: {
    type: 'kpi',
    purpose: 'State one measured value.',
    useWhen: ['A single number answers the question.'],
    avoidWhen: ['Three or more values belong together.'],
    example: { type: 'kpi', label: 'Error rate', value: '0.4%' },
  },
  examples: [{ type: 'kpi', label: 'Error rate', value: '0.4%' }],
  renderers: {
    react: (node) => <p>{`${node.label}: ${node.value}`}</p>,
    text: (node) => `${node.label}: ${node.value}`,
    markdown: (node) => `**${node.label}**: ${node.value}`,
  },
});

export const metricsPack = definePrimitivePack({ id: 'metrics', primitives: [kpi] });
```

`react`, `text`, and `markdown` are mandatory, which is what makes every composition degrade. `slack` is optional and falls back through Markdown. There is no `snapshot` renderer: the `snapshot` surface reuses `react`. Hand the pack to `createIsomerRuntime` from `@elastic/isomer-runtime` and every surface renders it.

## Docs

The [SDK docs](https://elastic.github.io/isomer/sdk/) have the [quick start](https://elastic.github.io/isomer/sdk/quick-start), the [primitive](https://elastic.github.io/isomer/sdk/primitives) and [pack](https://elastic.github.io/isomer/sdk/packs) contracts, [composition and validation](https://elastic.github.io/isomer/sdk/composition), [dispatch](https://elastic.github.io/isomer/sdk/dispatch), [rendering](https://elastic.github.io/isomer/sdk/rendering), [frame](https://elastic.github.io/isomer/sdk/frame), [URL trust](https://elastic.github.io/isomer/sdk/url-trust), [authoring](https://elastic.github.io/isomer/sdk/authoring), and the [API reference](https://elastic.github.io/isomer/sdk/api).

## Entry points

| Entry | Reach for it when |
| --- | --- |
| `.` | Defining primitives, packs, frames; validating |
| `./html` | Rendering HTML, writing a style adapter |
| `./text` | Text envelopes |
| `./markdown` | Markdown envelopes and formatting |
| `./slack` | Block Kit types, limits, asset collection |
| `./react` | React content helpers and dispatcher context |
| `./author` | JSX front end, agent prompts |
| `./testing` | Pack conformance harness |

`zod` and `react` are required peers. `react-dom` is optional and needed only by `./html`. Full reference: [API reference](https://elastic.github.io/isomer/sdk/api#entry-points).

## License

Source available under the Elastic License 2.0 (SPDX: `Elastic-2.0`). See [LICENSE.txt](LICENSE.txt).
