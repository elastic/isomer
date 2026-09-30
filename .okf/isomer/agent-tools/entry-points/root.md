---
type: Entry Point
title: Root
description: '@elastic/isomer-agent-tools tools, resources, the compose prompt, their types, and result helpers, with no MCP SDK reachable.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/src/index.ts
tags: [isomer, agent-tools, api]
status: stable
stale_after: 2027-03-29
sources:
  - id: entry
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/src/index.ts
    title: Root barrel
  - id: graph
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_module_graph.js
    title: Module graph check
---

# Definition

One entry. `createIsomerTools`, `createIsomerResources`, `createIsomerPrompts`, `buildIsomerAuthoringGuide`, `buildPrimitiveDescriptions`, `checkComposition`, `textResult`, `jsonResult`, `imageResult`, `ISOMER_TOOL_NAMES`, `ISOMER_AUTHORING_GUIDE_URI`, `ISOMER_COMPOSITION_SCHEMA_URI`, `ISOMER_COMPOSE_PROMPT`, and the `Isomer*` types.[^entry] `scripts/check_module_graph.js` fails when a file under `src/` names `@modelcontextprotocol/sdk` or the package lists it in `dependencies`, `peerDependencies`, or `optionalDependencies`.[^graph]

Related: [agent tools](/agent-tools/concepts/agent-tools.md), [public contract](/agent-tools/reference/public-contract.md).

[^entry]: Root barrel

[^graph]: Module graph check
