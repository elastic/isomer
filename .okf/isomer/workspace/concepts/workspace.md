---
type: Concept
title: Workspace
description: pnpm workspace for the SDK, runtime, image backend, slides, Studio, Lens core, metric charts, evals and agent tools.
resource: https://github.com/elastic/isomer/blob/main/package.json
tags: [isomer, workspace]
status: stable
stale_after: 2027-03-18
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/package.json
    title: Workspace package.json
  - id: agents
    resource: https://github.com/elastic/isomer/blob/main/AGENTS.md
    title: Agent instructions
  - id: readme
    resource: https://github.com/elastic/isomer/blob/main/README.md
    title: Repository README
---

# Definition

Isomer is a pnpm workspace whose packages under `packages/` resolve each other with `workspace:*` and, unless private, publish at one version; the README describes each package and the agent instructions its release posture and boundaries.[^readme][^agents]

Portable metric/trend declarations and primitive ownership live in `packages/isomer-primitives-charts`, while `packages/isomer-renderers-elastic-charts` owns browser drawing and a matched-reference comparison gate. Their package docs define the contract and the unavailable real Lens capture evidence; neither package is a Lens binder or query executor. Chart and slide palettes remain separate homogeneous runtimes.[^agents]

Related: [verify](/workspace/playbooks/verify.md), [publish](/workspace/playbooks/publish.md), [docs-builder](/workspace/playbooks/docs-builder.md), [conventions](/workspace/reference/conventions.md), [scoring](/evals/concepts/scoring.md), [agent tools](/agent-tools/concepts/agent-tools.md).

[^agents]: Agent instructions

[^readme]: Repository README
