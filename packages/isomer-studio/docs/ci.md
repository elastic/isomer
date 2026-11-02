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

| Input               | Default                    | What it does                                                                                 |
| ------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| `config`            | Required                   | The config, relative to `working-directory`.                                                 |
| `working-directory` | `.`                        | Where the `isomer-studio` command resolves. `config`, `out` and `report` resolve against it. |
| `check`             | `true`                     | Runs `check`, writing a JUnit report. A failure fails the step.                              |
| `png`               | `false`                    | Adds `--png` to the check.                                                                   |
| `report`            | `isomer-studio-report.xml` | Where the report goes. It uploads as `<artifact-name>-report`, even when the check fails.    |
| `build`             | `true`                     | Runs `build`, even when the check failed.                                                    |
| `out`               | `dist/studio`              | Where the site goes.                                                                         |
| `base`              | `./`                       | The URL path the site is served from.                                                        |
| `artifact-name`     | `isomer-studio`            | The name of the uploaded site.                                                               |

## Review a pull request

Open the PR's **ci** run and download `studio-<headSha>-<runId>-<attempt>`.
The **Studio preview** job checks out and confirms that head, checks examples,
builds the shared browser-only config, and tests the built site in Chromium.
The report is a separate `-report` artifact; failed browser checks retain traces
and screenshots. Merge-context verification still runs separately.

Extract the site into a directory named `studio`, then serve its parent:

```sh
npx serve .
```

Open `/studio/` on the printed local URL. The build uses `/studio/` as its asset
base, so keep that directory name. Slides, Decks, themes and JSX editing work
without PNG/PDF generation. This is a downloadable preview, not a hosted Studio.

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
