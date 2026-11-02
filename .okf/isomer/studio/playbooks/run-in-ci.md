---
type: Playbook
title: Run the Studio in CI
description: Check a pack and upload its Studio with the composite action, or with two commands.
tags: [isomer, studio, playbook]
status: stable
stale_after: 2027-04-07
sources:
  - id: action
    resource: https://github.com/elastic/isomer/blob/main/.github/actions/isomer-studio/action.yml
    title: Composite action
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/docs/ci.md
    title: Package docs
---

# Steps

Check a pack and upload its Studio with the composite action, or with `isomer-studio check` and `isomer-studio build` on another CI system, as the package's CI docs describe.[^docs]

In this repository, run `pnpm build` first so the Studio's `lib/` exists.

The shared browser-only config is built from the exact head in the Codex workflow, separately from merge-context verification. Artifact diagnostics are not trusted provenance; deployment derives expectations from GitHub event/API identity and verifies the archive digest before staging. See the [package CI docs](https://github.com/elastic/isomer/blob/main/packages/isomer-studio/docs/ci.md) for the trust boundary and separate hosted-evidence requirement.

Related: [root and CLI](/studio/entry-points/root.md).

[^docs]: Package docs
