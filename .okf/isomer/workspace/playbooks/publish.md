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

1. Dispatch the Publish a Release workflow. Dry run is the default.[^workflow]
2. The job runs `pnpm verify`, then installs `npm@^11.5.1`. pnpm 10 delegates `pnpm publish` to the ambient npm CLI, and trusted publishing needs npm >= 11.5.1.
3. `pnpm semantic-release` runs `semantic-release` 25. The workspace plugin analyzes and writes notes for only the commits that change a package published now or at the last release, a root build input, the root `build` scripts, or a published package's reference in `tsconfig.workspace.json`, then publishes `@elastic/isomer-sdk`, `@elastic/isomer-runtime`, `@elastic/isomer-image-takumi`, and `@elastic/isomer-studio` with `pnpm publish --access public --tag <channel>`. The tag is the semantic-release channel (`alpha` or `beta`), falling back to `latest` for the default release channel. Maintenance ranges such as `1.x` use `release-1.x`, since npm rejects semver ranges as tags. The private slides, evals, and agent-tools packages never publish. Authentication is the job's `id-token: write` permission.[^releaserc][^workspace-plugin]


# Snapshots

A push to `main` that changes a published package, a root build input, the lockfile, or the snapshot script or workflow runs the Snapshot job in the same workflow, since trusted publishing is bound to `release.yml`; dispatching with `snapshot` runs it by hand. After `pnpm verify`, `scripts/publish_snapshot.js` publishes every non-private package at one version, `<release + 1 patch>-main.<UTC commit time>.g<sha>`, under the `next` dist-tag, with no tag, commit, or GitHub Release. Every `workspace:` dependency and peer resolves to that snapshot, so an `@next` set is internally consistent. Consumers run `npx @elastic/isomer-studio@next` or install packages at `@next` together.[^workflow][^snapshot]

Related: [workspace](/workspace/concepts/workspace.md), [verify](/workspace/playbooks/verify.md).

[^workflow]: Publish a Release

[^releaserc]: semantic-release config

[^workspace-plugin]: Workspace publish plugin

[^snapshot]: Snapshot publish script
