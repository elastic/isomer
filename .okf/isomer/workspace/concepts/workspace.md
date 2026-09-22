---
type: Concept
title: Workspace
description: pnpm workspace that hosts the SDK, runtime, image backend, slides pack, and eval harness.
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

Every package under `packages/` publishes at one version: `@elastic/isomer-sdk` and `@elastic/isomer-runtime` are what a host installs, `@elastic/isomer-primitives-slides` is the reference pack, `@elastic/isomer-image-takumi` rasterizes the `svg` surface, and `@elastic/isomer-evals` scores agent output against a pack's authoring context. Nothing has been published or pushed.[^readme]

Hosts own data, authorization, routing, and side effects. Isomer owns the view contract, primitive catalog, validation, and rendering.

Related: [verify](/workspace/playbooks/verify.md), [publish](/workspace/playbooks/publish.md), [docs-builder](/workspace/playbooks/docs-builder.md), [conventions](/workspace/reference/conventions.md), [scoring](/evals/concepts/scoring.md).

[^package]: Workspace package.json

[^agents]: Agent instructions

[^readme]: Repository README
