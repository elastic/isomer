---
type: Concept
title: Workspace
description: pnpm workspace that hosts the SDK, runtime, image backend, and eval harness, which publish, and the private slides pack and agent tools.
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

Isomer is a pnpm workspace. Packages live under `packages/` and resolve each other with `workspace:*` plus TypeScript project references. There is no cross-package `paths` mapping between them.[^package][^agents]

A package under `packages/` publishes at one version unless it is `private`. `@elastic/isomer-sdk` and `@elastic/isomer-runtime` are what a host installs, `@elastic/isomer-image-takumi` rasterizes the `svg` surface, and `@elastic/isomer-evals` scores agent output against a pack's authoring context. `@elastic/isomer-primitives-slides`, the reference pack to copy, and `@elastic/isomer-agent-tools`, transport-neutral agent tools, resources, and a prompt, are private workspace libraries: their checks still run, and `scripts/check_pack_consumer.js` fails when a published package depends on either. Nothing has been published or pushed.[^readme][^agents]

`examples/*` are also workspace members: private, runnable apps built on the packages. `examples/deck` is the Isomer deck, a Vite app whose slides are compositions, and `examples/slides-studio` is the studio where an agent writes a deck over MCP. They sit outside `packages/`, so the publish, export, and license checks never see them.[^package]

Hosts own data, authorization, routing, and side effects. Isomer owns the view contract, primitive catalog, validation, and rendering.

Related: [verify](/workspace/playbooks/verify.md), [publish](/workspace/playbooks/publish.md), [docs-builder](/workspace/playbooks/docs-builder.md), [conventions](/workspace/reference/conventions.md), [scoring](/evals/concepts/scoring.md), [agent tools](/agent-tools/concepts/agent-tools.md).

[^package]: Workspace package.json

[^agents]: Agent instructions

[^readme]: Repository README
