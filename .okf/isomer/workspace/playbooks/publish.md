---
type: Playbook
title: Publish
description: OIDC trusted publishing. semantic-release publishes every non-private package under packages/ at one version; pushes to main publish a snapshot of each under next.
tags: [isomer, workspace, release]
status: stable
stale_after: 2027-03-21
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
  - id: snapshot
    resource: https://github.com/elastic/isomer/blob/main/scripts/publish_snapshot.js
    title: Snapshot publish script
---

# Steps

Releases and `next` snapshots publish through the Publish a Release workflow with npm trusted publishing; [RELEASING.md](https://github.com/elastic/isomer/blob/main/RELEASING.md) is the runbook for dry runs, Trusted Publishers, which commits count, and snapshot versions.

`pnpm semantic-release` runs `semantic-release` 25 on `main` only. The workspace plugin analyzes and writes notes for only the commits that change a package published now or at the last release, a root build input (`BUILD_INPUTS`), or the root `package.json` `build` scripts, writes the release version into every workspace manifest, then runs `pnpm -r publish --access public --tag latest`, which skips private and already-published packages. `@semantic-release/github` creates the release and comments on and labels `released` each included pull request.[^releaserc][^workspace-plugin]

Snapshots use the same rule: the workflow's Changes job runs `scripts/publish_snapshot.js --since <previous head>` and runs the Snapshot job only on `ships=true`, so the workflow has no `paths:` filter to keep in step.[^snapshot]

A publish that fails partway is recovered by hand from the tag; RELEASING.md has the commands.

Related: [workspace](/workspace/concepts/workspace.md), [verify](/workspace/playbooks/verify.md).

[^releaserc]: semantic-release config

[^workspace-plugin]: Workspace publish plugin

[^snapshot]: Snapshot publish script
