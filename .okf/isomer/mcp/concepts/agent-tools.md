---
type: Concept
title: Agent tools
description: createIsomerTools turns a runtime into five transport-neutral tools; validation is where model output is enforced.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-mcp/src/tools/create_tools.ts
tags: [isomer, mcp, agent]
status: stable
stale_after: 2027-03-23
sources:
  - id: tools
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-mcp/src/tools/create_tools.ts
    title: createIsomerTools
  - id: types
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-mcp/src/tools/types.ts
    title: Tool types
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-mcp/docs/index.md
    title: Package docs
---

# Definition

`createIsomerTools(options)` returns `isomer_authoring_guide`, `isomer_validate`, `isomer_render`, `isomer_list_views`, and `isomer_request_view` as `IsomerTool` values: a name, a title, a description, a Zod `inputSchema`, and a `handler` that resolves to `{ content, isError? }` with text or base64 PNG blocks.[^tools]

`runtime` is the structural `IsomerToolsRuntime`, not `IsomerRuntime`, so the package does not depend on the runtime. `frame` is any object with an optional `validateBody`, so an SDK `Frame` fits and its body rule runs on every validation and render. `image` adds the `png` surface. `hostContext` is required when the runtime's host context excludes `undefined`.[^types]

The `composition` input is a loose object whose description points the model at the guide. `checkComposition` runs `parse`, then `validate` on what parsed, then the frame's rule, and formats each finding with `formatValidationError`. An invalid composition is a normal `isomer_validate` answer and a failed `isomer_render` call.[^docs]

Related: [tools](/mcp/entry-points/tools.md), [root](/mcp/entry-points/root.md), [authoring context](/runtime/concepts/authoring-context.md), [SDK authoring](/sdk/concepts/authoring.md).

[^tools]: createIsomerTools

[^types]: Tool types

[^docs]: Package docs
