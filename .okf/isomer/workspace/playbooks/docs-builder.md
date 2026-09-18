---
type: Playbook
title: Docs-builder
description: Package docs stay in packages/*/docs. Root docs/ is the assembler; CI copies them at build time.
tags: [isomer, workspace, docs]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.7, at: 2026-09-22T00:50:00Z }
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
  - id: pack-contents
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_pack_contents.js
    title: Pack contents smoke
---

# Steps

1. Author pages under the package's `packages/<name>/docs/`.
2. Keep a `toc.yml` next to those pages.
3. List the package from `docs/docset.yml` (`toc: sdk`, and so on). The current set is runtime, sdk, slides, image-takumi, evals, and reference.[^docset]
4. Link across packages with a GitHub URL. A relative link to another package is absent from the tarball and fails `pnpm check:pack-contents`.[^pack-contents]
5. Preview with `pnpm docs:dev` (copies package docs, then `docs-builder serve` at http://localhost:3000). The builder refuses symlinks, so the copies are real directories. Do not commit them.[^assemble][^dev]
6. CI builds the set with `elastic/docs-builder@main`.[^ci]

The assembler product id is not registered yet; this repo's docs-builder job is an isolated build.

Related: [maintain OKF](/workspace/playbooks/maintain-okf.md), [workspace](/workspace/concepts/workspace.md).

[^docset]: Root docset

[^assemble]: Package docs copies

[^dev]: Local docs serve

[^ci]: docs-builder CI job

[^pack-contents]: Pack contents smoke
