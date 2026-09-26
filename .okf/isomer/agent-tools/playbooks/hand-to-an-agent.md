---
type: Playbook
title: Hand to an agent
description: Build a runtime, create the tools, resources, and prompt, and map them onto MCP or another agent framework.
tags: [isomer, agent-tools, playbook]
status: stable
stale_after: 2027-03-26
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/docs/index.md
    title: Package docs
  - id: adapter
    resource: https://github.com/elastic/isomer/blob/main/examples/slides-studio/server/mcp_adapter.ts
    title: Studio MCP adapter
---

# Steps

1. Build the runtime with `createIsomerRuntime` and register the views a model may request.
2. Call `createIsomerTools`, `createIsomerResources`, and `createIsomerPrompts` with `{ runtime }`. Add `frame` for a body rule such as `slideDeckFrame`, `image` for PNG renders, and `hostContext` for view builders. Build them per caller when `hostContext` differs.
3. For MCP, register each tool, resource, and prompt on an `McpServer`, registering a tool whose schema has no keys without `inputSchema`, then connect a Streamable HTTP or stdio transport. The slides studio's `registerIsomer` does this.[^adapter]
4. For the AI SDK or another framework, map each tool's `description`, `inputSchema`, and `handler` onto its tool shape, and use `compose`'s `build` as a system or user message.[^docs]

Related: [agent tools](/agent-tools/concepts/agent-tools.md), [root](/agent-tools/entry-points/root.md), [view registry](/runtime/concepts/view-registry.md).

[^docs]: Package docs

[^adapter]: Studio MCP adapter
