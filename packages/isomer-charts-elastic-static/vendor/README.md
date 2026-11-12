# Vendored Elastic Charts build

`elastic-charts-73.3.2-pr2941-c830c3bc.tgz` is `@elastic/charts` 73.3.2 with the SVG renderer (`<Chart renderer="svg">`). It is built from [elastic/elastic-charts#2941](https://github.com/elastic/elastic-charts/pull/2941), merged at `c830c3bce1b03c807c7faa1204b0a734551ecdbf`, with no patches.

`@elastic/isomer-charts-elastic-static` depends on the tarball, and injects the browser engine so that it builds its specs from this build too; every other package installs a released `@elastic/charts`. Once #2941 ships in a release, remove this directory and depend on that release.

To rebuild it, check out `c830c3bc`, build `packages/charts` with `yarn build`, and `npm pack` it.
