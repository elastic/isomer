---
navigation_title: In CI
description: Run isomer-studio check and build in GitHub Actions with the composite action, and upload the report and the site.
---

# In CI

`check` is the gate: it exits 1 when any example fails to validate or render. `build` is the preview: upload the site and every PR gets a Studio a reviewer can download.

## The GitHub Action

The Isomer repository has a composite action that runs both and uploads what they write. Install your dependencies first, including `@elastic/isomer-studio`, then:

```yaml
- uses: elastic/isomer/.github/actions/isomer-studio@main
  with:
    config: isomer-studio.config.ts
```

| Input | Default | What it does |
| --- | --- | --- |
| `config` | Required | The config, relative to `working-directory`. |
| `working-directory` | `.` | Where `@elastic/isomer-studio` is installed. `config`, `out` and `report` resolve against it. |
| `check` | `true` | Runs `check`, writing a JUnit report. A failure fails the step. |
| `png` | `false` | Adds `--png` to the check. |
| `report` | `isomer-studio-report.xml` | Where the report goes. It uploads as `<artifact-name>-report`, even when the check fails. |
| `build` | `true` | Runs `build`, even when the check failed. |
| `out` | `dist/studio` | Where the site goes. |
| `base` | `./` | The URL path the site is served from. |
| `artifact-name` | `isomer-studio` | The name of the uploaded site. |

Pin the action to a release tag rather than `main` once you depend on it. The Isomer repository runs it on the slides pack in its own CI, after `pnpm verify`.

## Without the action

The action is two commands. On another CI system, run them yourself:

```sh
npx isomer-studio check --config isomer-studio.config.ts --format junit --report isomer-studio-report.xml
npx isomer-studio build --config isomer-studio.config.ts --out dist/studio
```

`build` and `check --png` rasterize with `@elastic/isomer-image-takumi`, a native dependency the Studio installs for the platform it runs on.

## Deploying with docs

To serve the Studio from a docs site, build it into the site's output with the path it will be served from:

```sh
npx isomer-studio build --config isomer-studio.config.ts --out site/studio-app --base /my-docs/studio-app/
```

Give the app its own directory, not the one the Studio's or the pack's docs build into, so neither overwrites the other.
