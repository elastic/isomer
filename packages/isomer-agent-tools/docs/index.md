---
navigation_title: Agent tools
description: Turns any Isomer runtime into transport-neutral agent tools, resources, and a prompt.
---

# Agent tools

`@elastic/isomer-agent-tools` turns any Isomer runtime into agent tools: read the authoring guide, look up the primitives it indexes, validate a composition, render it, and, when the runtime registers views, list them and request one. Beside them it offers the guide and the composition JSON Schema as resources, and a `compose` prompt. Everything is plain data with a Zod schema, so the host brings the transport: an [MCP](https://modelcontextprotocol.io) server, the [AI SDK](https://ai-sdk.dev), or its own agent framework. The package depends on the SDK alone.

It is not published to npm yet; it lives in this repository until its API settles.

```ts
import {
  createIsomerPrompts,
  createIsomerResources,
  createIsomerTools,
} from '@elastic/isomer-agent-tools';

const tools = createIsomerTools({ runtime });
```

| Export | Shape |
| --- | --- |
| `createIsomerTools(options)` | `IsomerTool[]`: `name`, `title`, `description`, a Zod `inputSchema`, and `handler`, which receives what `inputSchema` parsed and resolves to `{ content, isError? }`. Each content block is text or a base64 PNG, the same shape as an MCP `CallToolResult` |
| `createIsomerResources(options)` | `IsomerResource[]`: the guide as `isomer://authoring-guide` (`text/markdown`) and the whole composition JSON Schema as `isomer://composition-schema` (`application/json`), each with `read()` |
| `createIsomerPrompts(options)` | `IsomerPrompt[]`: `compose`, whose `build({ request? })` returns the guide followed by the request. A host without prompts uses it as a system or user message |
| `DEFAULT_ISOMER_INSTRUCTIONS` | Server or system instructions that point an agent at the tools in order |
| `checkComposition`, `textResult`, `jsonResult`, `imageResult` | Helpers for a host's own tools: parse, validate, and apply the frame's body rule, returning `{ valid, errors, findings, warnings, composition? }`, and build results in the tools' shape |

`runtime` is declared structurally, as `IsomerToolsRuntime`, so this package does not depend on `@elastic/isomer-runtime`. Hosts pass a real `IsomerRuntime`, which satisfies it; the structural type exists to keep the dependency out, not for hand-built runtimes.

## The tools

| Tool | Input | Returns |
| --- | --- | --- |
| `isomer_authoring_guide` | none | The authoring overview: guide, rules, registered views, and an index of the primitives, one line each under the packs' groups |
| `isomer_describe_primitives` | `types` (1–12) | Each type's full catalog entry, with its example, then the JSON Schema `$defs` those types reach. `bodyNode` is a stub meaning any primitive. An unknown type is an error that lists the known ones |
| `isomer_validate` | `composition` | `{ valid, errors, warnings }` as JSON. An invalid composition is a normal answer, not a failed call |
| `isomer_render` | `composition`, `surface`, `theme?` | Text, Markdown, HTML with its CSS inline, Slack Block Kit as JSON, or a PNG image. An invalid composition returns its errors with `isError: true` |
| `isomer_list_views` | none | The registered views, with the questions each answers and its input schema |
| `isomer_request_view` | `id`, `input?` | The built composition and its validation, as JSON |

The two view tools are offered only when the runtime lists at least one view when the tools are created, so a host without views hands the agent no tool with nothing to return. `DEFAULT_ISOMER_INSTRUCTIONS` and `DEFAULT_ISOMER_GUIDE` name them conditionally, as "when `isomer_list_views` is offered".

The `composition` input is a loose object. The node union is recursive and too large for a tool schema, so the schema tells the model to read the guide and look up its primitives first, and `isomer_validate` is where shape is enforced.

`errors` come from `formatValidationError`, one `<path> (in <type>) <message>` string per finding, worded for the model to repair from. The type names the primitive the path lands in, which is what the model looks up to fix it. `checkComposition` also returns the same findings structured, as `findings: ValidationError[]` (`path`, `message`, `nodeType?`), so a host can render them without validating again; a frame rule's finding has an empty path.

The guide stays small because it only indexes the catalog: with the catalog and schema inline, most of a guide is a schema a model cannot read. A host that wants the whole schema reads the `isomer://composition-schema` resource.

## Options

| Option | Effect |
| --- | --- |
| `runtime` | The runtime whose catalog, validation, surfaces, and views the tools use |
| `guide` | Prose the guide opens with. Defaults to `DEFAULT_ISOMER_GUIDE` |
| `rules` | Bullets under the guide's `## Rules` |
| `examples` | Host compositions beyond each primitive's own catalog example |
| `profile` | The authoring profile. Defaults to `'compose-from-primitives'` |
| `frame` | A body rule the runtime does not enforce on every surface. Any SDK `Frame` fits; a frame's `validateBody`, such as the slides pack's one-frame rule, runs on every validation and render |
| `image` | `(composition, { theme }) => Promise<Uint8Array>`. Present, it adds `png` to the render surfaces |
| `heading` | Whether `isomer_render` draws the composition's title and subtitle. Defaults to `true`; pass `false` when the body carries its own, as a slide's frame does. The `png` surface ignores it, since `svg` has no heading option |
| `hostContext` | Passed to `viewRegistry.request`. Required when the runtime's host context does not accept `undefined` |

## Adapters

An adapter maps the three lists onto a transport. On an MCP `McpServer`:

```ts
for (const tool of tools) {
  const { name, title, description, inputSchema } = tool;
  server.registerTool(name, { title, description, inputSchema }, (input) => tool.handler(input));
}
for (const resource of resources) {
  const { name, uri, title, description, mimeType } = resource;
  server.registerResource(name, uri, { title, description, mimeType }, ({ href }) => ({
    contents: [{ uri: href, mimeType, text: resource.read() }],
  }));
}
for (const prompt of prompts) {
  const { name, title, description, argsSchema } = prompt;
  server.registerPrompt(name, { title, description, argsSchema: argsSchema.shape }, (args) => ({
    messages: [{ role: 'user', content: { type: 'text', text: prompt.build(argsSchema.parse(args)) } }],
  }));
}
```

The MCP SDK rejects a call that omits `arguments` against any `inputSchema`, so register a tool whose schema has no keys without one. The [slides studio](https://github.com/elastic/isomer/tree/main/examples/slides-studio)'s `server/adapters/mcp.ts` is a complete adapter, served over Streamable HTTP with a server per session. The same function works on the server Vercel's `mcp-handler` hands a route.

With the AI SDK, each tool becomes a `tool()`:

```ts
import { tool } from 'ai';

const aiTools = Object.fromEntries(
  tools.map((isomerTool) => [
    isomerTool.name,
    tool({
      description: isomerTool.description,
      inputSchema: isomerTool.inputSchema,
      execute: (input) => isomerTool.handler(input),
    }),
  ])
);
```

A host with its own agent framework maps each `IsomerTool` onto its tool shape the same way, and maps the result's content blocks onto its own result type:

```ts
const hostTools = tools.map((isomerTool) => ({
  name: isomerTool.name,
  description: isomerTool.description,
  schema: isomerTool.inputSchema,
  handler: async (input: unknown) => {
    const { content, isError } = await isomerTool.handler(isomerTool.inputSchema.parse(input));
    const parts = content.map((block) =>
      block.type === 'text'
        ? { kind: 'text', text: block.text }
        : { kind: 'image', bytes: Buffer.from(block.data, 'base64'), mimeType: block.mimeType }
    );
    return { parts, failed: isError === true };
  },
}));
```

Build the tools per caller when `hostContext` differs between callers.

## Model output is untrusted

Every composition a tool receives came from a model. `isomer_render` parses and validates before rendering, and renders the composition `parse` returned, never the raw input; URL fields go through the SDK's sanitizers on every surface. The tools read nothing and write nothing beyond what the runtime and the host's `image` and view builders do, so authorization stays with the host: decide what `hostContext` a caller gets and which views are registered before the server is built.
