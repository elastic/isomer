---
type: Concept
title: Agent tools
description: createIsomerTools, createIsomerResources, and createIsomerPrompts turn a runtime into transport-neutral tools, resources, and a compose prompt.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/src/tools/create_tools.ts
tags: [isomer, agent-tools, agent]
status: stable
stale_after: 2027-03-26
sources:
  - id: tools
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/src/tools/create_tools.ts
    title: createIsomerTools
  - id: types
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/src/tools/types.ts
    title: Tool types
  - id: resources
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/src/tools/resources.ts
    title: createIsomerResources
  - id: prompts
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/src/tools/prompts.ts
    title: createIsomerPrompts
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/docs/index.md
    title: Package docs
---

# Definition

`createIsomerTools(options)` returns `isomer_authoring_guide`, `isomer_describe_primitives`, `isomer_validate`, and `isomer_render`, plus `isomer_list_views` and `isomer_request_view` when the runtime's view registry lists at least one view, as `IsomerTool` values: a name, a title, a description, a Zod `inputSchema`, and a `handler` that resolves to `{ content, isError? }` with text or base64 PNG blocks. A handler never rejects: a failure resolves with its message and `isError: true`.[^tools]

`createIsomerResources(options)` returns the guide (`isomer://authoring-guide`, `text/markdown`) and the whole composition JSON Schema (`isomer://composition-schema`, `application/json`) as `IsomerResource` values with a live `read()`.[^resources] `createIsomerPrompts(options)` returns `compose`, an `IsomerPrompt` whose `build({ request? })` is the guide followed by the request.[^prompts] Nothing here depends on a transport: the host maps each list onto MCP, the AI SDK, or its own framework.

`runtime` is the structural `IsomerToolsRuntime`, not `IsomerRuntime`, so the package does not depend on the runtime. `frame` is any object with an optional `validateBody`, so an SDK `Frame` fits and its body rule runs on every validation and render. `image` adds the `png` surface. `hostContext` is required when the runtime's host context excludes `undefined`. `examples` are host compositions under the guide's `## Examples`, trimmed to the profile's budget: one, or none under `'registered-view-router'`.[^types][^docs]

The guide is an overview: guide, rules, views, and one line per primitive under the packs' `groups`, with no schema. `isomer_describe_primitives` returns the full entries and schema `$defs` of the types a model picks, from the runtime's `describePrimitives`, so a model reads only what it uses. The `composition` input is a loose object whose description points the model at both. `checkComposition` runs `parse`, then `validate` on what parsed, then the frame's rule, and returns each finding both as a structured `ValidationError` in `findings` and formatted with `formatValidationError` in `errors`, which names the primitive the path lands in. An invalid composition is a normal `isomer_validate` answer and a failed `isomer_render` call.[^docs]

`isomer_request_view` returns a built composition with its validation result, a failing one included. Input that fails the view's schema, or a `CompositionValidationError` the view throws, both recognized by `name` and `code`, returns `{ error, errors }` with `isError: true`; an unknown id or any other failure returns its message as text. `isomer_describe_primitives` answers an unknown type with an error listing the known ones. Names a tool echoes back are quoted as one-line JSON with `quoteInput`, and each host rule reaches the guide on one line through `oneLine`.[^tools]

Related: [root](/agent-tools/entry-points/root.md), [hand to an agent](/agent-tools/playbooks/hand-to-an-agent.md), [authoring context](/runtime/concepts/authoring-context.md), [SDK authoring](/sdk/concepts/authoring.md).

[^tools]: createIsomerTools

[^types]: Tool types

[^resources]: createIsomerResources

[^prompts]: createIsomerPrompts

[^docs]: Package docs
