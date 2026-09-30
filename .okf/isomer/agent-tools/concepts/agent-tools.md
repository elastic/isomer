---
type: Concept
title: Agent tools
description: createIsomerTools, createIsomerResources, and createIsomerPrompts turn a runtime into transport-neutral tools, resources, and a compose prompt.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/src/tools.ts
tags: [isomer, agent-tools, agent]
status: stable
stale_after: 2027-03-29
sources:
  - id: tools
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/src/tools.ts
    title: createIsomerTools
  - id: types
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/src/types.ts
    title: Tool types
  - id: resources
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/src/resources.ts
    title: createIsomerResources and createIsomerPrompts
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/docs/index.md
    title: Package docs
---

# Definition

`createIsomerTools(options)` returns `isomer_authoring_guide`, `isomer_describe_primitives`, `isomer_validate`, and `isomer_render`, plus `isomer_list_views` and `isomer_request_view` when the runtime's view registry lists a view at creation, as `IsomerTool` values: a name, a title, a description, a Zod `inputSchema`, and a `handler` that resolves to `{ content, isError? }` with text or base64 PNG blocks. A handler never rejects: a failure resolves with its message and `isError: true`. `isomer_describe_primitives` takes one to twelve `types` and `isomer_request_view` one `id`, each 1–200 characters.[^tools]

`createIsomerResources(options)` returns the guide (`isomer://authoring-guide`, `text/markdown`) and the whole composition JSON Schema (`isomer://composition-schema`, `application/json`) with a live `read()`. `createIsomerPrompts(options)` returns `compose`, whose `build({ request? })` is the guide followed by the request.[^resources] The host maps each list onto MCP, the AI SDK, or its own framework.

`runtime` is the structural `IsomerToolsRuntime`, so only the package's tests import the runtime. `frame` is any object with an optional `validateBody`, so an SDK `Frame` fits and its body rule runs on every validation and render. `image` adds the `png` surface, `heading: false` drops the title and subtitle from every surface but `png`, and `hostContext` is required when the runtime's host context excludes `undefined`.[^types]

The guide is the SDK's `buildAuthoringPrompt` with `catalog: 'index'`: guide, rules, views, and one line per primitive under the packs' `groups`, with no schema. `isomer_describe_primitives` returns the full entries and schema `$defs` of the types a model picks, from the runtime's `describePrimitives`; an unknown type answers with JSON listing `unknown` and `known`. `checkComposition` first refuses a value that nests deeper than 64 objects and arrays, holds more than 20,000 values or 1,000,000 characters, or contains itself, as one finding with an empty path; `isomer_request_view` refuses such `input` before the view runs. It then runs `parse`, then `validate`, then the frame's rule, and returns each finding as a `ValidationError` in `findings` and through `formatValidationError` in `errors`, which names the node type the path lands in. A `CompositionValidationError` or `RegisteredViewInputError` from `isomer_request_view`, recognized by `name` and `code`, returns `{ error, errors }`.[^docs]

Related: [root](/agent-tools/entry-points/root.md), [public contract](/agent-tools/reference/public-contract.md), [authoring context](/runtime/concepts/authoring-context.md), [SDK authoring](/sdk/concepts/authoring.md).

[^tools]: createIsomerTools

[^types]: Tool types

[^resources]: createIsomerResources and createIsomerPrompts

[^docs]: Package docs
