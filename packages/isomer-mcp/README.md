# `@elastic/isomer-mcp`

Turns any Isomer runtime into agent tools, with an MCP adapter. The tools read the authoring guide, validate a composition, render it to text, Markdown, HTML, Slack, or PNG, and request registered views.

```sh
npm install @elastic/isomer-mcp
```

```ts
import { createIsomerMcpServer } from '@elastic/isomer-mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = createIsomerMcpServer({ name: 'slides', version: '1.0.0', runtime });
await server.connect(new StdioServerTransport());
```

`@elastic/isomer-mcp/tools` exports the same tools without the MCP SDK, for hosts with their own agent framework. Every composition is treated as untrusted model output: it is parsed and validated before anything renders it.

## Docs

The [MCP and agent tools](https://elastic.github.io/isomer/mcp/) page covers the tools, the options, a Streamable HTTP host, and the security posture.

## License

Elastic License 2.0 (SPDX: `Elastic-2.0`). See [LICENSE.txt](LICENSE.txt).
