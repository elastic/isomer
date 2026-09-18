# `@elastic/isomer-sdk`

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

`react`, `text`, and `markdown` are mandatory, which is what makes every composition degrade. `slack` is optional and falls back through Markdown. There is no `svg` renderer: the image surface reuses `react`. Hand the pack to `createIsomerRuntime` from `@elastic/isomer-runtime` and every surface renders it.

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
| `./author` | JSX/builder front ends, agent prompts |
| `./testing` | Pack conformance harness |

`zod` and `react` are required peers. `react-dom` is optional and needed only by `./html`. Full reference: [API reference](https://elastic.github.io/isomer/sdk/api#entry-points).

## License

Source available under the Elastic License 2.0 (SPDX: `Elastic-2.0`). See [LICENSE.txt](LICENSE.txt).
