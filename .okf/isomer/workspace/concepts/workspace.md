---
type: Concept
title: Workspace
description: pnpm workspace that hosts the SDK, runtime, image backend, slides pack, eval harness, and agent tools.
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

Related: [verify](/workspace/playbooks/verify.md), [publish](/workspace/playbooks/publish.md), [docs-builder](/workspace/playbooks/docs-builder.md), [conventions](/workspace/reference/conventions.md), [scoring](/evals/concepts/scoring.md), [agent tools](/agent-tools/concepts/agent-tools.md).

[^agents]: Agent instructions

[^readme]: Repository README
