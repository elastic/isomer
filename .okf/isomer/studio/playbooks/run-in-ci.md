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

1. Install the pack's dependencies, including `@elastic/isomer-studio`, and add `isomer-studio.config.ts`.
2. In GitHub Actions, use `elastic/isomer/.github/actions/isomer-studio` with `config`. It runs `check --format junit --report <report>` and `build --out <out> --base <base>` from `working-directory`, uploads the report as `<artifact-name>-report` and the site as `<artifact-name>`, and builds even when the check fails.[^action]
3. Elsewhere, run `npx isomer-studio check --format junit --report report.xml` and `npx isomer-studio build --out dist/studio`.
4. To deploy beside docs, build into its own directory with the served path as `--base`, as this repository does at `/isomer/studio-app/`.[^docs]

Related: [root and CLI](/studio/entry-points/root.md).

[^action]: Composite action
[^docs]: Package docs
