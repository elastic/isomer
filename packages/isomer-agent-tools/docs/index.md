---
navigation_title: Agent tools
description: Turns any Isomer runtime into transport-neutral agent tools, resources, and a prompt.
---

# Agent tools

`@elastic/isomer-agent-tools` turns any Isomer runtime into agent tools: read the authoring guide, look up the primitives it indexes, validate a composition, render it, and, when the runtime registers views, list them and request one. Beside them it offers the guide and the composition JSON Schema as resources, and a `compose` prompt. Everything is plain data with a Zod schema, so the host brings the transport: an [MCP](https://modelcontextprotocol.io) server, the [AI SDK](https://ai-sdk.dev), or its own agent framework. The package depends on the SDK alone, and never on `@modelcontextprotocol/sdk`.

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

| Export | Shape |
| --- | --- |
| `createIsomerTools(options)` | `IsomerTool[]`: `name`, `title`, `description`, a Zod `inputSchema`, and `handler`, which receives what `inputSchema` parsed and resolves to `{ content, isError? }`. It never rejects: a failure resolves with its message and `isError: true`. Each content block is text, a base64 image, or an embedded resource with a base64 `blob`, the same shape as an MCP `CallToolResult`. Throws an `IsomerError` with code `DUPLICATE_FORMAT` when a host format is named `text`, `markdown`, `html`, or `slack` |
| `createIsomerResources(options)` | `IsomerResource[]`: the guide as `ISOMER_AUTHORING_GUIDE_URI` (`isomer://authoring-guide`, `text/markdown`) and the whole composition JSON Schema as `ISOMER_COMPOSITION_SCHEMA_URI` (`isomer://composition-schema`, `application/json`), each with a live `read()` |
| `createIsomerPrompts(options)` | `IsomerPrompt[]`: `ISOMER_COMPOSE_PROMPT` (`compose`), whose `build({ request? })` returns the guide followed by the request. A host without prompts uses it as a system or user message |
| `buildIsomerAuthoringGuide(options)`, `buildPrimitiveDescriptions({ runtime, types })` | The text `isomer_authoring_guide` and `isomer_describe_primitives` return |
| `checkComposition(runtime, frame, value)` | Parses, validates, and applies the frame's body rule to the copy `validate` checked, returning `IsomerCompositionCheck`: `{ valid, errors, findings, warnings, composition? }`, where `composition` is that copy |
| `textResult`, `jsonResult`, `imageResult` | Build results in the tools' shape, for a host's own tools. `imageResult(bytes, mimeType?)` defaults to `image/png`. `jsonResult` prints `null` for a value JSON cannot hold, and returns a value `JSON.stringify` throws on, such as a cycle or a `BigInt`, as a failed result with its message |
| `ISOMER_TOOL_NAMES` | The six tool names below |

`runtime` is declared structurally, as `IsomerToolsRuntime`, so only this package's tests import `@elastic/isomer-runtime`. Pass a real `IsomerRuntime`, which satisfies it.

## The tools

| Tool | Input | Returns |
| --- | --- | --- |
| `isomer_authoring_guide` | none | The guide, rules, registered views, and an index of the primitives, one line each under the packs' groups |
| `isomer_describe_primitives` | `types` (1–12, each 1–200 characters) | Each type's full catalog entry, with its example, then the JSON Schema `$defs` those types reach. `bodyNode` is a stub meaning any primitive. An unknown type is an error, as JSON with `unknown` and `known` |
| `isomer_validate` | `composition` | `{ valid, errors, warnings }` as JSON. An invalid composition is a normal answer, not a failed call |
| `isomer_render` | `composition`, `format`, `theme?` | Text, Markdown, HTML with its CSS inline, Slack Block Kit as JSON, or any format the host registers in `formats`. `theme` overrides the composition's own in HTML and reaches each host format's `render`. An invalid composition returns its errors with `isError: true` |
| `isomer_list_views` | none | The registered views, with the questions each answers and its input schema |
| `isomer_request_view` | `id` (1–200 characters), `input?` | `{ composition, valid, errors, warnings }` as JSON; a built composition that fails validation is a normal answer. `composition` is left out when the input budget refuses the built composition. Input that fails the input budget or the view's schema, or a `CompositionValidationError` the view throws, returns `{ error, errors }` with `isError: true`. Any other failure returns its message with `isError: true` |

The two view tools are offered only when the runtime lists a view when the tools are created.

The `composition` input is a loose object: the node union is recursive and too large for a tool schema, so its description sends the model to the guide and the primitive lookup first, and `isomer_validate` enforces shape.

Each of `errors` is a `formatValidationError` string, `<path> (in <type>) <message>`, naming the primitive the model should look up to repair it. `checkComposition` also returns the same findings as `ValidationError` values; a frame rule's finding has an empty path.

The guide indexes the catalog rather than inlining it, so it stays small as packs grow. A host that wants the whole schema reads the `isomer://composition-schema` resource.

## Options

| Option | Effect |
| --- | --- |
| `runtime` | The runtime whose catalog, validation, surfaces, and views the tools use |
| `guide` | Prose the guide opens with. Defaults to a short generic guide |
| `rules` | Bullets under the guide's `## Rules`, each collapsed to one line |
| `examples` | Host compositions under the guide's `## Examples`, trimmed to the profile's budget: one, or none under `'registered-view-router'` |
| `profile` | The authoring profile. Defaults to `'compose-from-primitives'` |
| `frame` | A body rule the runtime does not enforce on every surface. Any SDK `Frame` fits; its `validateBody`, such as the slides pack's one-frame rule, runs on every validation and render |
| `formats` | Formats `isomer_render` offers after the runtime's, by name. Each is an `IsomerToolsFormat`, `{ mimeType, render(composition, { theme }) }`; see [Host formats](#host-formats) |
| `heading` | Whether `isomer_render` draws the title and subtitle. Defaults to `true`; pass `false` when the body draws its own, as a slide does. Host formats do not receive it |
| `hostContext` | Passed to `viewRegistry.request`. Required when the runtime's host context does not accept `undefined`; build the tools per caller when it differs between callers |

`createIsomerResources` and `createIsomerPrompts` take `runtime`, `guide`, `rules`, `examples`, and `profile` (`IsomerGuideOptions`).

## Host formats

The runtime renders `text`, `markdown`, `html`, and `slack` itself. Anything else, such as a PNG, an SVG, or a PDF, is a format the host renders from the runtime's `snapshot` surface, so the tools take each as a renderer rather than a flag. A rasterizer that writes several formats registers one entry per format:

```ts
const takumi = createTakumiImageBackend({ fonts });
const { snapshot } = runtime.surfaces;

const tools = createIsomerTools({
  runtime,
  formats: {
    png: { mimeType: 'image/png', render: (composition, options) => takumi.png(snapshot.render(composition, options)) },
    svg: { mimeType: 'image/svg+xml', render: (composition, options) => takumi.svg(snapshot.render(composition, options)) },
    pdf: {
      mimeType: 'application/pdf',
      render: (composition, options) => takumi.pdf(snapshot.renderPages([composition], options)),
    },
  },
});
```

How a format answers follows its `mimeType`. An `image/*` type answers as an image block, a string `render` result UTF-8 encoded first, so an SVG reaches a client that displays images. Any other type answers as a text block when `render` resolves to a string, and otherwise as an embedded resource, `{ type: 'resource', resource: { uri, mimeType, blob } }`, whose `uri` is `isomer://render/<format>`. A `render` that rejects is a failed call with its message.

## Adapters

An adapter maps the three lists onto a transport. On an MCP `McpServer`:

```ts
for (const tool of tools) {
  const { name, title, description, inputSchema } = tool;
  if (Object.keys(inputSchema.shape).length === 0) {
    server.registerTool(name, { title, description }, () => tool.handler(inputSchema.parse({})));
  } else {
    server.registerTool(name, { title, description, inputSchema }, (input) => tool.handler(input));
  }
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

The MCP SDK rejects a call that omits `arguments` against any `inputSchema`, even one with no keys, so a tool whose schema has no keys is registered without one.

With the AI SDK, each tool becomes a `tool()`:

```ts
import { tool } from 'ai';

const aiTools = Object.fromEntries(
  tools.map(({ name, description, inputSchema, handler }) => [
    name,
    tool({ description, inputSchema, execute: (input) => handler(input) }),
  ])
);
```

## Model output is untrusted

Every composition a tool receives came from a model. The runtime's `parse`, `validate`, and `viewRegistry.request` apply the SDK's input budget, `checkInputBudget`, before anything else reads a composition or a view's `input`: by default it must nest at most 64 objects and arrays deep, hold at most 20,000 values, hold at most 1,000,000 characters across object keys and leaves, contain no cycle, and be plain data. The runtime's `inputBudget` option changes the limits. A refusal is one finding with an empty path and the code `INPUT_OVER_BUDGET` or `INPUT_NOT_PLAIN_DATA`, which `checkComposition` keeps in `findings`: `isomer_validate` answers `valid: false`, `isomer_render` fails with the same errors, and `isomer_request_view` fails with `{ error, errors }` before the view sees the input. `isomer_render` parses and validates before rendering, and renders the copy `validate` checked, never the raw input; URL fields go through the SDK's sanitizers on every surface. The tools read and write nothing beyond what the runtime and the host's formats and view builders do, so authorization stays with the host: decide what `hostContext` a caller gets and which views are registered before building the tools.
