---
type: Playbook
title: Serve over MCP
description: Build a runtime, pass it to createIsomerMcpServer, and connect a transport.
tags: [isomer, mcp, playbook]
status: stable
stale_after: 2027-03-23
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-mcp/docs/index.md
    title: Package docs
  - id: server
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-mcp/src/mcp/server.ts
    title: createIsomerMcpServer
---

# Steps

1. Build the runtime with `createIsomerRuntime` and register the views a model may request.
2. Pass it to `createIsomerMcpServer({ name, version, runtime })`. Add `frame` for a body rule such as `slideDeckFrame`, `image` for PNG renders, and `hostContext` for view builders.
3. Register host tools on the returned server, then connect a Streamable HTTP or stdio transport. A server per request keeps `hostContext` per caller.
4. Without MCP, call `createIsomerTools` from `@elastic/isomer-mcp/tools` and map each tool onto the host's agent framework.[^docs][^server]

Related: [agent tools](/mcp/concepts/agent-tools.md), [root](/mcp/entry-points/root.md), [view registry](/runtime/concepts/view-registry.md).

[^docs]: Package docs

[^server]: createIsomerMcpServer
