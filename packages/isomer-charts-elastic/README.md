<!-- markdownlint-disable MD033 -->
<p align="center">
  <img src="https://raw.githubusercontent.com/elastic/isomer/main/docs/logo.svg" alt="Isomer" width="96" height="96">
</p>
<h1 align="center">@elastic/isomer-charts-elastic</h1>
<p align="center"><strong>isomer</strong> <i>n.</i> — one formula, many forms; the same composition rendered to every surface.</p>
<!-- markdownlint-enable MD033 -->

`SceneRenderer`s that draw Isomer chart Scenes (`metric`, `xy`, `partition`, `heatmap`, `gauge`, `tagCloud`) with Elastic Charts, as Kibana draws its panels: in the browser, and on Node as static markup for an image.

```sh
npm install @elastic/isomer-charts-elastic @elastic/charts moment moment-timezone react react-dom zod
```

```ts
import { createElasticChartsRenderer } from '@elastic/isomer-charts-elastic';
import { createElasticChartsNodeRenderer } from '@elastic/isomer-charts-elastic/node';
```

Read the [documentation](https://github.com/elastic/isomer/blob/main/packages/isomer-charts-elastic/docs/index.md).
