# Vendored Elastic Charts build

`elastic-charts-73.3.2-pr2939-a87de627.tgz` is `@elastic/charts` 73.3.2 with headless SVG rendering. It is built from [elastic/elastic-charts#2939](https://github.com/elastic/elastic-charts/pull/2939) at `a87de627268648e492d6d298e377bae8726ce256`, with the two patches beside it applied:

| Patch | Why |
| --- | --- |
| `0001-experiment-emit-numeric-font-weight-on-text.patch` | Writes numeric font weights on SVG `<text>`. Without it, weights of 500 and above become `bold`, and text overflows its measured width. |
| `0002-experiment-renderChart-returns-DebugState.patch` | `renderChart` returns `{ debugState }`, so a headless render can be checked as the browser's `<Chart debugState>` is. |

Both patches are offered on #2939.

The root `package.json` points `pnpm.overrides["@elastic/charts"]` at the tarball, so every workspace package, including the browser engine, installs this build. The build exists for `feature/charts-rendering`. It must not reach `main`: once #2939 ships in a release, remove this directory and the override, and depend on that release.

To rebuild it, check out #2939, apply the patches with `git am`, build `packages/charts`, and `npm pack` it.
