<!-- markdownlint-disable MD033 -->
<p align="center">
  <img src="https://raw.githubusercontent.com/elastic/isomer/main/docs/logo.svg" alt="Isomer" width="96" height="96">
</p>
<h1 align="center">@elastic/isomer-benchmarks</h1>
<p align="center"><strong>isomer</strong> <i>n.</i> — one formula, many forms; the same composition rendered to every surface.</p>
<p align="center">
  <a href="https://github.com/elastic/isomer/actions/workflows/ci.yml"><img src="https://github.com/elastic/isomer/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/elastic/isomer/blob/main/LICENSE.txt"><img src="https://img.shields.io/badge/License-Elastic%202.0-blue.svg" alt="License: Elastic License 2.0"></a>
</p>
<!-- markdownlint-enable MD033 -->

Measures what each Isomer package costs to load, run and ship, apart from any host. It loads the built packages through their public entries, as a Node host does, with one fresh process per run.

This package is private and not published to npm; it runs from this repository.

```sh
pnpm build
pnpm --filter @elastic/isomer-benchmarks bench load
pnpm --filter @elastic/isomer-benchmarks bench synthetic
pnpm --filter @elastic/isomer-benchmarks bench charts
```

See [the docs](docs/index.md) for what each suite claims, [the results](docs/results.md), and [sizing a host](docs/sizing.md).
