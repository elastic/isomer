# `@elastic/isomer-agent-tools`

Turns any Isomer runtime into transport-neutral agent tools, resources, and a prompt. The tools read the authoring guide, look up the primitives it indexes, validate a composition, render it to text, Markdown, HTML, Slack, or PNG, and, when the runtime registers views, list and request them. The host brings the transport: an MCP server, the AI SDK, or its own agent framework.

It is not published to npm yet; it lives in this repository until its API settles.

```ts
import {
  createIsomerPrompts,
  createIsomerResources,
  createIsomerTools,
} from '@elastic/isomer-agent-tools';

const tools = createIsomerTools({ runtime });
const resources = createIsomerResources({ runtime });
const prompts = createIsomerPrompts({ runtime });
```

Every composition is treated as untrusted model output: it is parsed and validated before anything renders it.

## Docs

The [Agent tools](https://elastic.github.io/isomer/agent-tools/) page covers the tools, the options, adapters for MCP and the AI SDK, and the security posture.

## License

Elastic License 2.0 (SPDX: `Elastic-2.0`). See [LICENSE.txt](LICENSE.txt).
