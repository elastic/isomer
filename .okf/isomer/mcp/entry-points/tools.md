---
type: Entry Point
title: Tools
description: '@elastic/isomer-mcp/tools createIsomerTools and the guide builder, with no MCP SDK reachable.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-mcp/src/entries/tools.ts
tags: [isomer, mcp, api]
status: stable
stale_after: 2027-03-23
sources:
  - id: entry
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-mcp/src/entries/tools.ts
    title: Tools entry
  - id: graph
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_module_graph.js
    title: Module graph check
---

# Definition

`createIsomerTools`, `buildIsomerAuthoringGuide`, `checkComposition`, `DEFAULT_ISOMER_GUIDE`, `ISOMER_TOOL_NAMES`, and the `IsomerTool*` types.[^entry] `scripts/check_module_graph.js` fails when this entry reaches `@modelcontextprotocol/sdk`, so a host with its own agent framework never loads it.[^graph]

Related: [agent tools](/mcp/concepts/agent-tools.md), [root](/mcp/entry-points/root.md).

[^entry]: Tools entry

[^graph]: Module graph check
