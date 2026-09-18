# Contributing to Isomer

Read [AGENTS.md](AGENTS.md) first: conventions, invariants, and where things live, written for a human contributor and a coding agent alike.

## Development

Prerequisites: Node.js 22 or later (see `.nvmrc`) and pnpm via Corepack.

```sh
corepack enable
pnpm install
pnpm verify
```

`pnpm verify` is the full local gate: typecheck, lint (ESLint with Prettier as a rule, markdownlint, and license headers), tests, the dual ESM/CJS build, and the `check:*` scripts (export parity, package exports, emitted declarations, pack contents, module graph, packed consumer) plus `pnpm licenses:report --check`. CI runs the same command.

Useful individual scripts:

- `pnpm test` — unit tests
- `pnpm lint` / `pnpm lint:fix` — ESLint (including Prettier) and markdownlint
- `pnpm build` — the ESM build, specifier rewriting, and the CommonJS pass (see below)
- `pnpm licenses:report` — regenerate `THIRD_PARTY_LICENSES.md` and `NOTICE.txt`
- `pnpm docs:dev` — copy package docs into the assembler and serve with live reload (`docs-builder serve`, <http://localhost:3000>). Requires the [docs-builder](https://github.com/elastic/docs-builder) binary (`curl -sL https://ela.st/docs-builder-install | sh`)

## The build

`pnpm build` is `tsc --build` for ESM, then two steps that exist because there is no bundler. Sources import relative modules without extensions, and Node's ESM loader requires them, so `scripts/rewrite_specifiers.js` runs `tsc-alias` to append `.js` to every relative specifier in `dist`. A second `tsc` pass then emits CommonJS under `dist/cjs` for `require` consumers, whose Node10 resolution cannot read an `exports` map; `scripts/write_cjs_manifest.js` marks that directory `"type": "commonjs"`. `check:export-parity` proves the two builds expose the same names.

## Adding a package

Create `packages/<name>` with a `package.json` that declares a `typecheck` script, plus `tsconfig.json`, `tsconfig.build.json`, and `tsconfig.build.cjs.json` modeled on a sibling. Then, by hand: add a reference to `tsconfig.workspace.json`, a `toc` entry to `docs/docset.yml`, a `workspace:*` devDependency to the root `package.json`, and a paragraph to `AGENTS.md`. Everything else (typecheck, tests and their source aliases, docs assembly, the license report, and the `check:*` scripts) derives from `packages/*`.

## Releasing

A release never commits to `main`, publishes through npm trusted publishing only, and starts from a dry run. [RELEASING.md](RELEASING.md) is the runbook.

## Agent knowledge bundle (OKF)

`.okf/isomer` is an [Open Knowledge Format](https://github.com/okfcli/okf) bundle: plain markdown with frontmatter that describes the packages for coding agents, separate from the human docs in `packages/*/docs`. CI validates it, fails on concepts past their `stale_after` date, and checks that every cited repo path still exists.

You only need the `okf` CLI when you change public API, docs, examples, or behavior and update the bundle to match:

```sh
brew install --cask okfcli/okf/okf   # or: go install github.com/okfcli/okf/cmd/okf@latest
pnpm okf:check                        # validate, anchors, generated map
pnpm okf:index                        # regenerate indexes after editing concepts
```

CI pins the CLI version in `.github/workflows/okf.yml`. Record meaningful bundle changes in `.okf/isomer/log.md`.

## Pull requests

- Use [conventional commits](https://www.conventionalcommits.org/). `feat:` and `fix:` drive the next release version.
- Add tests for behavioral changes.
- Run `pnpm verify` before opening a PR.

## License headers

First-party source files carry:

```ts
Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
or more contributor license agreements. Licensed under the Elastic License
2.0; you may not use this file except in compliance with the Elastic License
2.0.
```

Licensed under the Elastic License 2.0 (SPDX: `Elastic-2.0`). See [`LICENSE.txt`](LICENSE.txt). `pnpm lint:fix` inserts a missing header. Do not stack a second one.
