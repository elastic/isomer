# Vendored Elastic Charts build

`elastic-charts-73.3.2-pr2941-pr2939-aa07e20b.tgz` is `@elastic/charts` 73.3.2 with the SVG renderer and headless SVG rendering: [elastic/elastic-charts#2939](https://github.com/elastic/elastic-charts/pull/2939) (`a87de627`) rebased onto [elastic/elastic-charts#2941](https://github.com/elastic/elastic-charts/pull/2941), merged at `c830c3bce1b03c807c7faa1204b0a734551ecdbf`. The patches beside it are that rebase and two experiments on it, built at `aa07e20b88c7fc72108f17cd9557fb31e425ef66`:

| Patch | Why |
| --- | --- |
| `0001-feat-headless-SVG-rendering-for-server-side-chart-pr.patch` | #2939, rebased. #2941 moved the canvas renderers onto its `Painter`, so the headless renderers draw through a `CanvasPainter` over #2939's `SvgCanvas` context, which builds paths with #2939's `createPath2D` and, given `textures: false`, draws textured fills plain. The base has an `exports` map, so the package exports `./headless` and `./dist/headless`. |
| `0002-experiment-emit-numeric-font-weight-on-text.patch` | Writes numeric font weights on SVG `<text>`. Without it, weights of 500 and above become `bold`, and text overflows its measured width. |
| `0003-experiment-renderChart-returns-DebugState.patch` | `renderChart` returns `{ debugState }`, so a headless render can be checked as the browser's `<Chart debugState>` is. |

`@elastic/isomer-charts-elastic-static` depends on the tarball, and injects the browser engine so that it builds its specs from this build too; every other package installs a released `@elastic/charts`. Once both pull requests ship in a release, remove this directory and depend on that release.

To rebuild it, check out `c830c3bc`, apply the patches with `git am`, build `packages/charts` with `yarn build`, and `npm pack` it.
