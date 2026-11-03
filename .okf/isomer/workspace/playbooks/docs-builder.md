---
type: Playbook
title: Docs-builder
description: Package docs stay in packages/*/docs. Root docs/ is the assembler and holds committed copies that Codex builds as is.
tags: [isomer, workspace, docs]
status: stable
stale_after: 2027-03-18
sources:
  - id: docset
    resource: https://github.com/elastic/isomer/blob/main/docs/docset.yml
    title: Root docset
  - id: assemble
    resource: https://github.com/elastic/isomer/blob/main/scripts/assemble_package_docs.js
    title: Package docs copies
  - id: dev
    resource: https://github.com/elastic/isomer/blob/main/scripts/docs_dev.js
    title: Local docs serve
  - id: ci
    resource: https://github.com/elastic/isomer/blob/main/.github/workflows/ci.yml
    title: docs-builder CI job
  - id: codex-preview
    resource: https://github.com/elastic/isomer/blob/main/.github/workflows/codex-preview.yml
    title: Elastic Internal Docs preview
  - id: pack-contents
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_pack_contents.js
    title: Pack contents smoke
---

# Steps

Package docs are authored in each package's `docs/` and assembled into committed copies under root `docs/`; [AGENTS.md](https://github.com/elastic/isomer/blob/main/AGENTS.md) and [CONTRIBUTING.md](https://github.com/elastic/isomer/blob/main/CONTRIBUTING.md) cover `pnpm docs:assemble`, `pnpm docs:check` and `pnpm docs:dev`.

1. Author pages under the package's `packages/<name>/docs/`.
2. Keep a `toc.yml` next to those pages.
3. List the package from `docs/docset.yml` (`toc: sdk`, and so on). The current set is runtime, sdk, slides, image-takumi, evals, and reference.[^docset]
4. Link across packages with a GitHub URL. A relative link to another package is absent from the tarball and fails `pnpm check:pack-contents`.[^pack-contents]
5. The builder refuses symlinks, so the copies are real directories.[^assemble]
6. CI builds the set with `elastic/docs-builder@main`.[^ci]
7. `docs.yml` keeps publishing GitHub Pages on `main`. `codex-preview.yml` updates the Elastic Internal Docs link index on `main`, which publishes the live Codex site, and deploys a Codex preview for same-repository pull requests. It inlines rather than calls `elastic/docs-actions`' reusable workflow so `assemble_package_docs.js` can run before the build; the reusable workflow has no hook for that step. The `codex-preview.yml` and `codex-preview-cleanup.yml` paths are bound to token policies, so do not rename either.[^codex-preview]

The assembler product id is not registered yet; this repo's docs-builder job is an isolated build.

Related: [maintain OKF](/workspace/playbooks/maintain-okf.md), [workspace](/workspace/concepts/workspace.md).

[^docset]: Root docset

[^assemble]: Package docs copies

[^ci]: docs-builder CI job

[^codex-preview]: Elastic Internal Docs preview

[^pack-contents]: Pack contents smoke
