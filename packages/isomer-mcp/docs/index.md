---
navigation_title: MCP and agent tools
description: Turns any Isomer runtime into agent tools, with an MCP adapter.
---

# MCP and agent tools

`@elastic/isomer-mcp` turns any Isomer runtime into five agent tools: read the authoring guide, validate a composition, render it, list registered views, and request one. The tools are transport-neutral; the root entry registers them on an [MCP](https://modelcontextprotocol.io) server.

```ts
import { createIsomerMcpServer } from '@elastic/isomer-mcp';

const server = createIsomerMcpServer({ name: 'slides', version: '1.0.0', runtime });
```

## Two entries

| Entry | Exports | Depends on |
| --- | --- | --- |
| `@elastic/isomer-mcp/tools` | `createIsomerTools`, `buildIsomerAuthoringGuide`, `checkComposition`, `ISOMER_TOOL_NAMES`, and the tool types | The SDK. Never reaches `@modelcontextprotocol/sdk`. |
| `@elastic/isomer-mcp` | `createIsomerMcpServer`, `registerIsomerTools`, `toCallToolResult`, plus everything in `./tools` | `@modelcontextprotocol/sdk` |

A host with its own agent framework imports `./tools` and maps each `IsomerTool` (`name`, `title`, `description`, a Zod `inputSchema`, and `handler`) onto that framework's tool shape. `handler` receives what `inputSchema` parsed and resolves to `{ content, isError? }`, where each content block is text or a base64 PNG — the same shape as an MCP `CallToolResult`.

`runtime` is declared structurally, as `IsomerToolsRuntime`, so this package does not depend on `@elastic/isomer-runtime`. An `IsomerRuntime` satisfies it.

## The tools

| Tool | Input | Returns |
| --- | --- | --- |
| `isomer_authoring_guide` | none | The authoring prompt: guide, rules, registered views, the primitive catalog with an example each, and the composition JSON Schema |
| `isomer_validate` | `composition` | `{ valid, errors, warnings }` as JSON. An invalid composition is a normal answer, not a failed call |
| `isomer_render` | `composition`, `surface`, `theme?` | Text, Markdown, HTML with its CSS inline, Slack Block Kit as JSON, or a PNG image. An invalid composition returns its errors with `isError: true` |
| `isomer_list_views` | none | The registered views, with the questions each answers and its input schema |
| `isomer_request_view` | `id`, `input?` | The built composition and its validation, as JSON |

The `composition` input is a loose object. The node union is recursive and too large for a tool schema, so the schema tells the model to read the guide first, and `isomer_validate` is where shape is enforced.

`errors` come from `formatValidationError`, one `<path> <message>` string per finding, worded for the model to repair from.

## Options

| Option | Effect |
| --- | --- |
| `runtime` | The runtime whose catalog, validation, surfaces, and views the tools use |
| `guide` | Prose the guide opens with. Defaults to `DEFAULT_ISOMER_GUIDE` |
| `rules` | Bullets under the guide's `## Rules` |
| `examples` | Host compositions beyond each primitive's own catalog example |
| `profile` | The authoring profile. Defaults to `'compose-from-primitives'` |
| `frame` | A body rule the runtime does not enforce on every surface. Any SDK `Frame` fits; `slideDeckFrame` adds the one-`slideFrame` rule to every validation and render |
| `image` | `(composition, { theme }) => Promise<Uint8Array>`. Present, it adds `png` to the render surfaces |
| `hostContext` | Passed to `viewRegistry.request`. Required when the runtime's host context does not accept `undefined` |

## An MCP server

`createIsomerMcpServer({ name, version, instructions?, ...options })` returns an `McpServer` with the five tools, the guide as the `isomer://authoring-guide` resource (`text/markdown`), and a `compose` prompt: the guide, followed by an optional `request`. Register the host's own tools on the returned server.

```ts
import { createServer } from 'node:http';

import { createIsomerMcpServer } from '@elastic/isomer-mcp';
import { createTakumiImageBackend, renderPng } from '@elastic/isomer-image-takumi';
import { slideDeckFrame, slidesPack } from '@elastic/isomer-primitives-slides';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const runtime = createIsomerRuntime({ packs: [slidesPack], frames: { slide: slideDeckFrame } });
const takumi = createTakumiImageBackend({ fonts });

const image = async (composition, { theme }) =>
  (await renderPng(runtime, composition, takumi, { svg: { theme } })).png;

createServer(async (req, res) => {
  const server = createIsomerMcpServer({
    name: 'slides',
    version: '1.0.0',
    runtime,
    frame: slideDeckFrame,
    image,
    hostContext: await sessionFor(req),
  });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => void server.close());
  await server.connect(transport);
  await transport.handleRequest(req, res);
}).listen(3000);
```

A server per request keeps `hostContext` per caller. For a local client, connect a `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js` instead.

To add the tools to a server the host already built, call `registerIsomerTools(server, createIsomerTools(options))`.

## Model output is untrusted

Every composition a tool receives came from a model. `isomer_render` parses and validates before rendering, and renders the composition `parse` returned, never the raw input; URL fields go through the SDK's sanitizers on every surface. The tools read nothing and write nothing beyond what the runtime and the host's `image` and view builders do, so authorization stays with the host: decide what `hostContext` a caller gets and which views are registered before the server is built.
