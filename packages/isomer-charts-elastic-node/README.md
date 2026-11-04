<!-- markdownlint-disable MD033 -->
<p align="center">
  <img src="https://raw.githubusercontent.com/elastic/isomer/main/docs/logo.svg" alt="Isomer" width="96" height="96">
</p>
<h1 align="center">@elastic/isomer-charts-elastic-node</h1>
<p align="center"><strong>isomer</strong> <i>n.</i> — one formula, many forms; the same composition rendered to every surface.</p>
<!-- markdownlint-enable MD033 -->

Draws Isomer chart Scenes (`metric`, `xy`) with Elastic Charts in Node, in jsdom with Skia on a worker thread, as markup the `snapshot` surface rasterizes.

```sh
npm install @elastic/isomer-charts-elastic-node @elastic/charts @napi-rs/canvas jsdom moment moment-timezone react react-dom zod
```

```ts
import { createElasticChartsNodeRenderer } from '@elastic/isomer-charts-elastic-node';
```

Read the [documentation](https://github.com/elastic/isomer/blob/main/packages/isomer-charts-elastic-node/docs/index.md).
