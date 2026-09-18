# Releasing

How a release of the workspace packages is cut, and the follow-through once the repository is public. Each item is enough for a human or an agent to act on without private context.

## Cut a release

A release never commits to `main`. Git tags track released versions, `scripts/semantic_release_workspace.js` writes the version into the workspace manifests when it publishes, and the notes land on the GitHub Releases page. That is why `package.json` says `0.0.0-development` and `CHANGELOG.md` is a pointer rather than a generated file — see the [semantic-release FAQ](https://semantic-release.org/support/faq/). It also sidesteps the org `Require a PR` ruleset, which rejects any push to `main` and covers `release/*` branch names too.

1. Confirm `main` is green and the release-driving commits since the last tag are the ones you intend to ship.
2. Run **Publish a Release** (`release.yml`) with **dry_run** enabled. It is `workflow_dispatch` only — nothing publishes on push. This exercises `pnpm verify` and semantic-release without tagging or publishing, and prints the notes. Read them: this is the checkpoint before anything is public. With no prior git tag the first release is **0.1.0**, because `scripts/run_semantic_release.js` patches semantic-release's `FIRST_RELEASE`, which is both the first tag and `main`'s allowed version range. Confirm the log says `the next release version is 0.1.0`, not `1.0.0`. This dry run is safe before a Trusted Publisher exists: this repo publishes through `scripts/semantic_release_workspace.js` (`pnpm publish`), not `@semantic-release/npm`, so `prepare` and `publish` are skipped under `--dry-run` and nothing talks to the npm registry.
3. On npmjs.com, configure a Trusted Publisher for every package under `packages/` (`@elastic/isomer-sdk`, `@elastic/isomer-runtime`, `@elastic/isomer-primitives-slides`, `@elastic/isomer-image-takumi`, `@elastic/isomer-evals`): GitHub Actions, repository `elastic/isomer`, workflow `release.yml`. Publishing uses npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) only (`id-token: write`); there is no `NPM_TOKEN` fallback. Do this before a non-dry run. Provenance is emitted automatically under trusted publishing. The workflow installs `npm@^11.5.1` because pnpm 10 still shells out to that CLI.
4. Run it again with `dry_run: false`. That tags the version, publishes every non-private workspace package to the npm registry, and creates the GitHub Release carrying the notes.

Later `feat:` commits become `0.2.0`, `0.3.0`, …; a `BREAKING CHANGE` becomes `1.0.0`. The supported consumer install is `npm install @elastic/isomer-sdk` (and `@elastic/isomer-runtime`) from registry.npmjs.org. All workspace packages ship at the same version.

## Move CI onto shared infrastructure

Pull-request checks currently run on GitHub Actions and call `pnpm verify`. A shared CI pipeline should call the same script.

- [`catalog-info.yaml`](catalog-info.yaml) is the service-catalog descriptor. Add a pipeline resource there when the pipeline exists.
- [`.buildkite/pull-requests.json`](.buildkite/pull-requests.json) is a disabled template for pull-request builds. Enable it and point `pipeline_slug` at the registered pipeline.

No check logic needs to be rewritten to change runners.

## Keep the license report current

`THIRD_PARTY_LICENSES.md` is the source and distribution dependency manifest. `NOTICE.txt` carries the product notice plus each runtime dependency's NOTICE and license text. After any dependency change:

```sh
pnpm licenses:report
```

Commit both files. CI fails `pnpm licenses:report --check` when they drift.
