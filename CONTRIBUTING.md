# Contributing to Isomer

Read [AGENTS.md](AGENTS.md) first: conventions, invariants, and where things live, written for a human contributor and a coding agent alike.

## Development

Prerequisites: Node.js 22 or later (see `.nvmrc`) and pnpm via Corepack.

```sh
corepack enable
pnpm install
pnpm exec playwright install chromium
pnpm verify
```

The Playwright install is a one-time step that downloads the Chromium `verify` drives; on Linux, add `--with-deps`.

`pnpm verify` is the full local gate: typecheck, lint (ESLint with Prettier as a rule, markdownlint, and license headers), tests, the ESM and CommonJS build, and the `check:*` scripts (export parity, package exports, emitted declarations, pack contents, module graph, packed consumer), the Studio's browser tests, and `pnpm licenses:report --check`. CI runs the same command.

`pnpm verify:fast` is the inner loop: the build, then typecheck, lint, and the license check side by side, then the tests, which resolve packages through their built `lib`. It skips the packed checks and the browser tests, so run `pnpm verify` before opening a PR. ESLint caches results in `node_modules/.cache/eslint/` and rechecks only files whose content changed, so a type-aware rule can miss an error that a change in another file causes; delete the cache, or let CI's fresh run catch it.

CI also runs the typecheck, the node tests, and the packed consumer check at three peer targets: `floor` (the lowest versions the published peer ranges admit), `kibana` (what elastic/kibana pins on `main`), and `latest` (the highest versions they admit). To reproduce one, run `node scripts/apply_peer_target.js <target>` and `pnpm install --no-frozen-lockfile`, then restore `package.json` and `pnpm-lock.yaml`.

Useful individual scripts:

- `pnpm test` — unit tests
- `pnpm lint` / `pnpm lint:fix` — ESLint (including Prettier) and markdownlint
- `pnpm studio:dev` — the Studio for the slides pack, run from the Studio's TypeScript source so edits to the Studio and to the pack both hot-update without a reload. Extra flags pass through, for example `pnpm studio:dev --port 5180`. Run `pnpm build` once first; edits to the SDK or runtime need it again.
- `pnpm test:browser` — the Studio's Playwright test of `dev` and a static build
- `pnpm check:studio-consumer` — installs the packed Studio with npm outside the workspace, then runs `check`, `build`, and the browser test against a consumer's own config
- `pnpm build` — every package's ESM, CommonJS and declaration builds (see below)
- `pnpm licenses:report` — regenerate `THIRD_PARTY_LICENSES.md` and `NOTICE.txt` for the workspace, and each published package's own, scoped to what a consumer installs with it for the workspace, and for each published package scoped to what a consumer installs with it
- `pnpm docs:dev` — copy package docs into the assembler and serve with live reload (`docs-builder serve`, <http://localhost:3000>). Requires the [docs-builder](https://github.com/elastic/docs-builder) binary (`curl -sL https://ela.st/docs-builder-install | sh`)

## The build

`pnpm build` runs each package's `build` in dependency order, the way `elastic/eui`'s packages build. `build:clean` empties `lib/`; `build:compile` runs Babel over `src` for CommonJS in `lib/cjs`; `build:compile:esm` runs `tsc -p tsconfig.esm.json` for ESM in `lib/esm`; `build:types` runs `tsc -p tsconfig.types.json` for declarations in `lib/cjs`. A package with a hand-written `.cjs` module copies it into `lib/cjs` with `copy-files`, and the Studio writes its prebuilt app to `lib/app` with `build:assets`.

The ESM keeps extensionless relative imports, so it is for bundlers: Node consumers `require` the CommonJS build, and every export maps `types`, `import`, `require` and `default` (the CommonJS build). `check:export-parity` holds every manifest to that shape, `check:exports` requires each export, and `check:pack-consumer` requires each packed export, bundles its ESM with esbuild for Node and the browser, and compiles its declarations under `node10`, `nodenext` and `bundler` resolution.

## Adding a package

Create `packages/<name>` with a `package.json` that declares the `build`, `build:*` and `typecheck` scripts, plus `tsconfig.json`, `tsconfig.esm.json`, `tsconfig.types.json`, and `babel.config.js` modeled on a sibling. Then, by hand: add a `toc` entry to `docs/docset.yml`, a `workspace:*` devDependency to the root `package.json`, and a paragraph to `AGENTS.md`. Everything else (typecheck, tests and their source aliases, docs assembly, the license report, and the `check:*` scripts) derives from `packages/*`.

## Releasing

A release never commits to `main`, publishes through npm trusted publishing only, and starts from a dry run. [RELEASING.md](RELEASING.md) is the runbook.

## Agent knowledge bundle (OKF)

`.okf/isomer` is an [Open Knowledge Format](https://github.com/okfcli/okf) bundle: plain markdown with frontmatter that holds agent-facing detail the human docs in `packages/*/docs` don't cover, and points to those docs for the rest. CI validates it, warns on concepts past their `stale_after` date, and checks that every cited repo path still exists.

You only need the `okf` CLI when a change alters detail a concept keeps and you update the bundle to match:

```sh
brew install --cask okfcli/okf/okf   # or: go install github.com/okfcli/okf/cmd/okf@latest
pnpm okf:check                        # validate, anchors, generated map
pnpm okf:index                        # regenerate indexes after editing concepts
```

CI pins the CLI version in `.github/workflows/okf.yml`.

## Pull requests

- Use [conventional commits](https://www.conventionalcommits.org/). `feat:` and `fix:` drive the next release version when they change a published package.
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
