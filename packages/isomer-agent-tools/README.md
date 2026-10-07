<!-- markdownlint-disable MD033 -->
<p align="center">
  <img src="https://raw.githubusercontent.com/elastic/isomer/main/docs/logo.svg" alt="Isomer" width="96" height="96">
</p>
<h1 align="center">@elastic/isomer-agent-tools</h1>
<p align="center"><strong>isomer</strong> <i>n.</i> — one formula, many forms; the same composition rendered to every surface.</p>
<p align="center">
  <a href="https://github.com/elastic/isomer/actions/workflows/ci.yml"><img src="https://github.com/elastic/isomer/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/elastic/isomer/blob/main/LICENSE.txt"><img src="https://img.shields.io/badge/License-Elastic%202.0-blue.svg" alt="License: Elastic License 2.0"></a>
</p>
<!-- markdownlint-enable MD033 -->

Turns any Isomer runtime into transport-neutral agent tools, resources, and a prompt. The tools read the authoring guide, look up the primitives it indexes, validate a composition, render it to text, Markdown, HTML, Slack, or, with a host rasterizer, PNG, and, when the runtime registers views, list and request them. The host brings the transport: an MCP server, the AI SDK, or its own agent framework.

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
