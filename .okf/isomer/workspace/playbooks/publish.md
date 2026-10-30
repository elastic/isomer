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

`pnpm semantic-release` runs `semantic-release` 25. The workspace plugin analyzes and writes notes for only the commits that change a package published now or at the last release, a root build input, the root `build` scripts, or a published package's reference in `tsconfig.workspace.json`, then publishes `@elastic/isomer-sdk`, `@elastic/isomer-runtime`, `@elastic/isomer-image-takumi`, and `@elastic/isomer-studio` with `pnpm publish --access public --tag <channel>`. The tag is the semantic-release channel (`alpha` or `beta`), falling back to `latest` for the default release channel. Maintenance ranges such as `1.x` use `release-1.x`, since npm rejects semver ranges as tags.[^releaserc][^workspace-plugin]

Related: [workspace](/workspace/concepts/workspace.md), [verify](/workspace/playbooks/verify.md).

[^releaserc]: semantic-release config

[^workspace-plugin]: Workspace publish plugin
