---
type: Reference
title: Public contract
description: Elastic-2.0, published as @elastic/isomer-sdk. react and zod are required peers, react-dom optional; eight dual-format entries, Node 22.13.0.
tags: [isomer, sdk, contract]
status: stable
stale_after: 2027-03-18
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/package.json
    title: Package metadata and exports
  - id: agents
    resource: https://github.com/elastic/isomer/blob/main/AGENTS.md
    title: Agent instructions
---

# Definition

- Source available under the Elastic License 2.0 (SPDX: `Elastic-2.0`). Publishes as `@elastic/isomer-sdk` with public access, at the workspace's one version. Peers: `react` `>=18 <20` and `zod` `^4.4.1` are required. `react-dom` `>=18 <20` is optional and needed by `./html`.[^package]
- Dependencies: `acorn`, which `./html` uses to embed scripts, and the GFM parser and serializer (`mdast-util-from-markdown`, `micromark-extension-gfm`, `mdast-util-to-markdown`, `mdast-util-gfm`), which the root, `./markdown`, and `./slack` reach. `./text` reaches nothing; `./testing` is the only entry that reaches Node built-ins.
- Entries: `.` · `./html` · `./text` · `./markdown` · `./slack` · `./react` · `./author` · `./testing`, each with `import` and `require` conditions and a `typesVersions` mapping for `Node10` resolvers. The tarball carries `dist`, `LICENSE.txt`, `NOTICE.txt`, and `THIRD_PARTY_LICENSES.md`.
- Dual ESM/CJS. `engines.node` `>=22.13.0`. `zod` stays a peer; do not add it to `dependencies`.
- Brands use `Symbol.for`. Identify `IsomerError` by `name` and `code`; identify `CompositionValidationError` by `name`, `code`, and `errors`.
- The sdk must not import the runtime.[^agents]

Related: [pipeline](/sdk/concepts/pipeline.md), [root](/sdk/entry-points/root.md).

[^package]: Package metadata and exports

[^agents]: Agent instructions
