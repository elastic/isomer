---
type: Playbook
title: Publish
description: OIDC trusted publishing. semantic-release publishes every non-private package, first at 0.1.0.
tags: [isomer, workspace, release]
status: stable
stale_after: 2027-03-26
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
  - id: first-release
    resource: https://github.com/elastic/isomer/blob/main/scripts/run_semantic_release.js
    title: First-release patch
---

# Steps

1. Dispatch the Publish a Release workflow. Dry run is the default.[^workflow]
2. The job runs `pnpm verify`, then installs `npm@^11.5.1`. pnpm 10 delegates `pnpm publish` to the ambient npm CLI, and trusted publishing needs npm >= 11.5.1.
3. `pnpm semantic-release` runs `semantic-release` 25. The workspace plugin writes one version into every package, then publishes each `packages/*` package without `private: true` with `pnpm publish --access public`: the SDK, the runtime, image-takumi, and evals. The slides pack and agent tools are private. Authentication is the job's `id-token: write` permission.[^releaserc][^workspace-plugin]
4. With no prior tag the first version is `0.1.0`, not `1.0.0`: `scripts/run_semantic_release.js` patches semantic-release's `FIRST_RELEASE` through a module loader. Confirm it in the dry run's log.[^first-release]

Related: [workspace](/workspace/concepts/workspace.md), [verify](/workspace/playbooks/verify.md).

[^workflow]: Publish a Release

[^releaserc]: semantic-release config

[^workspace-plugin]: Workspace publish plugin

[^first-release]: First-release patch
