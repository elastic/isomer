---
type: Entry Point
title: Root
description: '@elastic/isomer-mcp createIsomerMcpServer and registerIsomerTools, plus everything in ./tools.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-mcp/src/entries/index.ts
tags: [isomer, mcp, api]
status: stable
stale_after: 2027-03-23
sources:
  - id: entry
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-mcp/src/entries/index.ts
    title: Root entry
  - id: server
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-mcp/src/mcp/server.ts
    title: createIsomerMcpServer
---

# Definition

`createIsomerMcpServer`, `registerIsomerTools`, `toCallToolResult`, `ISOMER_AUTHORING_GUIDE_URI`, `ISOMER_COMPOSITION_SCHEMA_URI`, `ISOMER_COMPOSE_PROMPT`, and every `./tools` export.[^entry]

`createIsomerMcpServer({ name, version, instructions?, ...toolOptions })` returns an `McpServer` with the tools, the guide as the `isomer://authoring-guide` resource, the whole composition schema as `isomer://composition-schema`, and a `compose` prompt. Hosts register their own tools on it. `registerIsomerTools` registers a tool with an empty input shape without an `inputSchema`, because the MCP SDK rejects a call that omits `arguments` against any schema.[^server]

Related: [agent tools](/mcp/concepts/agent-tools.md), [tools](/mcp/entry-points/tools.md), [serve over MCP](/mcp/playbooks/serve-over-mcp.md).

[^entry]: Root entry

[^server]: createIsomerMcpServer
