---
type: Playbook
title: Verify
description: Run the complete local gate with pnpm verify.
tags: [isomer, workspace, verify]
status: stable
stale_after: 2027-03-18
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/package.json
    title: verify script
  - id: ci
    resource: https://github.com/elastic/isomer/blob/main/.github/workflows/ci.yml
    title: CI verify job
  - id: module-graph
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_module_graph.js
    title: Module graph smoke
  - id: pack-consumer
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_pack_consumer.js
    title: Packed consumer check
  - id: pack-contents
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_pack_contents.js
    title: Pack contents smoke
  - id: studio-consumer
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_studio_consumer.js
    title: Studio consumer check
---

# Steps

Install with Corepack and Playwright's Chromium, then run `pnpm verify`, the complete local gate, as [CONTRIBUTING.md](https://github.com/elastic/isomer/blob/main/CONTRIBUTING.md) and [AGENTS.md](https://github.com/elastic/isomer/blob/main/AGENTS.md) describe; `pnpm verify:fast` is the inner loop.

`pnpm verify:fast` emits the ESM build first, because type-aware lint resolves workspace packages through their declarations, then runs typecheck, lint, and the license report's `--check` side by side through `scripts/run_parallel.js`, which prints each command's output whole and fails if any failed, then the tests alone, since Vitest already uses every core.[^package]

Pack contents checks required legal and docs files, declared `files` entries, export targets, fixture leakage, and relative documentation links inside the tarball. The packed-consumer check imports every published package from its packed tarball, ESM and CJS, with required peers installed, and fails on any process warning, such as the `ExperimentalWarning` Node 22.12 prints when `require()` loads an ES module. The module-graph walk fails when `react-dom` or `react-dom/server` is reachable from `.`, `./text`, `./markdown`, `./slack`, or `./author`.[^pack-contents][^pack-consumer] `./schema` also excludes React and Markdown parsers. Charts `./schema`, `./scene` and `./resolve` exclude those dependencies and use only the SDK's `./schema` entry. Vega `./schema` excludes them and Vega too, and uses only the SDK's and the charts pack's `./schema` entries. Chart engines import only the charts `./scene` entry (ESLint).[^module-graph]

`pnpm test:browser` drives the Studio's `dev` server and a static build of the slides config in Chromium, then lays charts out at their size specs in Chromium (`packages/isomer-primitives-charts/e2e`), then scores the Elastic Charts engine's browser drawing of every example against its headless one (`packages/isomer-charts-elastic/e2e`), then hydrates a Vega chart and checks its tooltip, signals and chart events with no fetch (`packages/isomer-primitives-vega/e2e`), and fails with the install command when Chromium is missing. Arguments filter the suites: one with no match is skipped, and the command fails when none matches. The Studio consumer check packs the Studio, SDK, runtime, and takumi, installs them with npm in a temporary directory without `NODE_PATH`, typechecks a consumer's own pack and config with `skipLibCheck` off, requires `check --png` to pass and a broken example to exit 1, then runs the same browser test against that install's `build --base /sub/` and `dev`.[^studio-consumer]

CI splits the scripts `pnpm verify` runs across parallel jobs on Node 24, except the Studio consumer check, which runs on Node 22.13.0, the `engines` floor. Peer-target jobs cover the other Node versions: `floor` on 22.13.0, `kibana` on the Node in Kibana's `.nvmrc`, and `latest` on 26. An aggregate `verify` job requires the split jobs but not the peer targets, and docs-builder runs in its own job. Studio's browser tests bind `localStorage` and `sessionStorage` to jsdom and restore the host globals after each test file, so they need no Web Storage flags.[^ci]

Related: [workspace](/workspace/concepts/workspace.md), [docs-builder](/workspace/playbooks/docs-builder.md).

[^package]: verify script

[^ci]: CI verify job

[^module-graph]: Module graph smoke

[^pack-consumer]: Packed consumer check

[^pack-contents]: Pack contents smoke

[^studio-consumer]: Studio consumer check
