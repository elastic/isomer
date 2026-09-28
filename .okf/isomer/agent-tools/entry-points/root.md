---
type: Entry Point
title: Root
description: '@elastic/isomer-agent-tools tools, resources, the compose prompt, their types, and result helpers, with no MCP SDK reachable.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/src/entries/index.ts
tags: [isomer, agent-tools, api]
status: stable
stale_after: 2027-03-26
sources:
  - id: entry
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/src/entries/index.ts
    title: Root entry
  - id: graph
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_module_graph.js
    title: Module graph check
---

# Definition

`createIsomerTools`, `createIsomerResources`, `createIsomerPrompts`, `buildIsomerAuthoringGuide`, `buildPrimitiveDescriptions`, `checkComposition`, `textResult`, `jsonResult`, `imageResult`, `DEFAULT_ISOMER_GUIDE`, `DEFAULT_ISOMER_INSTRUCTIONS`, `ISOMER_TOOL_NAMES`, `ISOMER_AUTHORING_GUIDE_URI`, `ISOMER_COMPOSITION_SCHEMA_URI`, `ISOMER_COMPOSE_PROMPT`, and the `IsomerTool*`, `IsomerResource`, `IsomerPrompt`, and `CompositionCheck` types.[^entry] `scripts/check_module_graph.js` fails when the entry reaches `@modelcontextprotocol/sdk`.[^graph]

Related: [agent tools](/agent-tools/concepts/agent-tools.md), [public contract](/agent-tools/reference/public-contract.md).

[^entry]: Root entry

[^graph]: Module graph check
