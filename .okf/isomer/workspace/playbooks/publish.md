---
type: Playbook
title: Publish
description: OIDC trusted publishing. semantic-release publishes the SDK and the runtime.
tags: [isomer, workspace, release]
status: stable
stale_after: 2027-03-21
generated: { by: cursor/grok-4.7, at: 2026-09-22T00:50:00Z }
sources:
  - id: workflow
    resource: https://github.com/elastic/isomer/blob/main/.github/workflows/release.yml
    title: Publish a Release
  - id: releaserc
    resource: https://github.com/elastic/isomer/blob/main/.releaserc.json
    title: semantic-release config
  - id: workspace-plugin
    resource: https://github.com/elastic/isomer/blob/main/scripts/semantic_release_workspace.js
    title: Workspace publish plugin
---

# Steps

1. Dispatch the Publish a Release workflow. Dry run is the default.[^workflow]
2. The job runs `pnpm verify`, then installs `npm@^11.5.1`. pnpm 10 delegates `pnpm publish` to the ambient npm CLI, and trusted publishing needs npm >= 11.5.1.
3. `pnpm semantic-release` runs `semantic-release` 25. The workspace plugin publishes `@elastic/isomer-sdk` and `@elastic/isomer-runtime` with `pnpm publish --access public`. Authentication is the job's `id-token: write` permission.[^releaserc][^workspace-plugin]

Related: [workspace](/workspace/concepts/workspace.md), [verify](/workspace/playbooks/verify.md).

[^workflow]: Publish a Release

[^releaserc]: semantic-release config

[^workspace-plugin]: Workspace publish plugin
