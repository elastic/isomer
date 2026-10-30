# Releasing

How a release of the workspace packages is cut, and the follow-through once the repository is public. Each item is enough for a human or an agent to act on without private context.

## Cut a release

A release never commits to `main`. Git tags track released versions, `scripts/semantic_release_workspace.js` writes the version into the workspace manifests when it publishes, and the notes land on the GitHub Releases page. That is why `package.json` says `0.0.0-development` and `CHANGELOG.md` is a pointer rather than a generated file — see the [semantic-release FAQ](https://semantic-release.org/support/faq/). It also sidesteps the org `Require a PR` ruleset, which rejects any push to `main` and covers `release/*` branch names too.

1. Confirm `main` is green and the release-driving commits since the last tag are the ones you intend to ship.
2. Run **Publish a Release** (`release.yml`) with **dry_run** enabled. Releases are `workflow_dispatch` only; a push to `main` publishes only the snapshot below, never a release. This exercises `pnpm verify` and semantic-release without tagging or publishing, and prints the notes. Read them: this is the checkpoint before anything is public. This dry run is safe before a Trusted Publisher exists: this repo publishes through `scripts/semantic_release_workspace.js` (`pnpm publish`), not `@semantic-release/npm`, so `prepare` and `publish` are skipped under `--dry-run` and nothing talks to the npm registry.
3. On npmjs.com, configure a Trusted Publisher for every non-private package under `packages/` (`@elastic/isomer-sdk`, `@elastic/isomer-runtime`, `@elastic/isomer-image-takumi`, `@elastic/isomer-studio`): GitHub Actions, repository `elastic/isomer`, workflow `release.yml`. Publishing uses npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) only (`id-token: write`); there is no `NPM_TOKEN` fallback. Do this before a non-dry run. Provenance is emitted automatically under trusted publishing. The workflow installs `npm@^11.5.1` because pnpm 10 still shells out to that CLI.
4. Run it again with `dry_run: false`. That tags the version, publishes every non-private package under `packages/` to the npm registry, and creates the GitHub Release carrying the notes.

A `feat:` commit releases the next minor; while the package is pre-1.0, a `BREAKING CHANGE` footer or a `!` after the type (`feat!:`) also releases a minor and is listed under breaking changes in the notes. To cut `1.0.0`, change the `breaking` rule in `.releaserc.json` back to `major` and update `scripts/releaserc.test.js` to match. Only a commit that changes the folder of a package published now or at the last release, or a root build input listed in `scripts/semantic_release_workspace.js`, counts toward the version or appears in the notes. For the root `package.json` and `tsconfig.workspace.json`, only the `build` scripts and the published packages' references count; a `feat:` or `fix:` confined to the slides pack, docs, or tooling does not cut a release. The supported consumer install is `npm install @elastic/isomer-sdk` (and `@elastic/isomer-runtime`) from registry.npmjs.org. All published packages ship at the same version.

## Snapshots under `next`

Every push to `main` that changes a published package, a root build input, the lockfile, or the snapshot script or workflow runs the **Snapshot** job in `release.yml`; `scripts/publish_snapshot.test.js` fails when its path filter drifts from `packages/` or `BUILD_INPUTS`. Snapshots publish from that file because npm Trusted Publishing is bound to it. The job runs `pnpm verify`, then `scripts/publish_snapshot.js`, which publishes every non-private package under the `next` dist-tag with no git tag, commit, or GitHub Release:

- Every package shares one version, a prerelease of the patch after the latest `v*` tag: `<major>.<minor>.<patch + 1>-main.<UTC commit time>.g<short sha>`. It sorts after that release and before the next one, and no `latest` or `^x.y.z` range admits it.
- Every `workspace:` dependency and peer resolves to that same snapshot (`workspace:*` exactly, `workspace:^` as `^<snapshot>`), so an `@next` set is one consistent build of `main`: `npm install @elastic/isomer-sdk@next @elastic/isomer-runtime@next` gets a matching pair, and the Studio's Takumi is the one it was built with.
- `npx @elastic/isomer-studio@next` works in a host still on released packages: the Studio loads the SDK, and the runtime when the pack has one, from the pack, so it runs against the host's copies; `npx` installs the `next` peers into its own cache, where nothing loads them. A Studio change that needs unreleased SDK or runtime code works there once the host installs those at `@next` too.

To publish one by hand, dispatch **Publish a Release** with **snapshot** enabled (and **dry_run** to only pack). Snapshots accumulate on the registry; `npm dist-tag ls @elastic/isomer-sdk` shows which one `next` points at.

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
