---
navigation_title: In CI
description: Run isomer-studio check and build in GitHub Actions with the composite action, and upload the report and the site.
---

# In CI

`check` is the gate: it exits 1 when any example fails to validate or render. `build` is the preview: upload the site and every PR gets a Studio a reviewer can download.

## The GitHub Action

The Isomer repository has a composite action that runs both and uploads what they write. It runs the `isomer-studio` binary installed in `working-directory`, so install the pack's dependencies, `@elastic/isomer-studio` among them, first. Then:

```yaml
- uses: elastic/isomer/.github/actions/isomer-studio@main
  with:
    config: isomer-studio.config.ts
```

| Input               | Default                    | What it does                                                                                                         |
| ------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `config`            | Required                   | The config, relative to `working-directory`.                                                                         |
| `working-directory` | `.`                        | Where the `isomer-studio` command resolves. `config`, `out` and `report` resolve against it.                         |
| `check`             | `true`                     | Runs `check`, writing a JUnit report. A failure fails the step.                                                      |
| `png`               | `false`                    | Adds `--png` to the check.                                                                                           |
| `report`            | `isomer-studio-report.xml` | Where the report goes. It uploads as `<artifact-name>-report`, even when the check fails.                            |
| `build`             | `true`                     | Runs `build`, even when the check failed.                                                                            |
| `out`               | `dist/studio`              | Where the site goes.                                                                                                 |
| `base`              | `./`                       | The URL path the site is served from.                                                                                |
| `artifact-name`     | `isomer-studio`            | The name of the uploaded site.                                                                                       |
| `upload-site`       | `true`                     | Uploads a successful build. Disable when adding provenance before a separate upload. The check report still uploads. |

The Isomer repository verifies the merge context separately with `pnpm verify`.
Its Codex workflow builds the shared browser-only config from the exact PR head
in a contents-read-only job, checks the examples, and exercises the built
artifact in Chromium. It uploads JUnit and
`studio-<headSha>-<runId>-<attempt>`; failures retain browser traces/screenshots.
Fork PRs retain downloadable artifacts but are not deployed.

`build.json` records the full source/checkout SHA, repository, PR, workflow run
and attempt, config, workspace package versions, disabled image generation and
examples-only/no-live-data designation. The page links to this diagnostic file
with its full SHA and run identity visible. This file is **not a trust root**:
deployment independently identifies the current PR head and eligible workflow
run using GitHub APIs, selects the uniquely named artifact from that run,
checks its archive bytes against the API's SHA-256 digest, and compares its
metadata with event/run expectations. Missing/expired/ambiguous artifacts,
API failures, changed digests and mismatches fail deployment. Archive extraction
rejects traversal, links, special files, duplicate entries and excessive size.

## Without the action

The action is two commands. On another CI system, run them yourself:

```sh
npx isomer-studio check --config isomer-studio.config.ts --format junit --report isomer-studio-report.xml
npx isomer-studio build --config isomer-studio.config.ts --out dist/studio
```

`npx @elastic/isomer-studio check` also works without installing the Studio, but an installed one keeps CI on the version the lockfile pins.

By default, `build` and `check --png` rasterize with
`@elastic/isomer-image-takumi`, a native dependency the Studio installs for the
platform it runs on. [Browser-only mode](config.md#browser-only-mode) avoids
loading it; `check --png` fails explicitly in that mode.

## Deploying with docs

To serve the Studio from a docs site, build it into the site's output with the path it will be served from:

```sh
npx isomer-studio build --config isomer-studio.config.ts --out site/studio-app --base /my-docs/studio-app/
```

Give the app its own directory, not the one the Studio's or the pack's docs build into, so neither overwrites the other.

For eligible same-repository PRs, Isomer's Codex deployment stages the verified
archive at `studio/<headSha>/<runId>-<attempt>/` below the docs preview prefix.
The deployment job executes no scripts from the PR checkout. Its summary gives
the exact preview and artifact identity. An uploaded archive or successful S3
sync is not proof the hosting policy permits an interactive app: verify the
live page, JS/WASM/CSS/fonts, subpath/hash navigation and both themes before
claiming hosted browser evidence. Local browser and packed-consumer checks
cannot establish hosted permissions or deployment settings.
