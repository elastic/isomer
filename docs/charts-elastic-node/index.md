---
navigation_title: Elastic Charts engine for Node
description: Draws chart Scenes with Elastic Charts in Node, in jsdom with Skia on a worker thread, as markup the snapshot surface rasterizes.
---

# Elastic Charts engine for Node

`@elastic/isomer-charts-elastic-node` draws [chart Scenes](../charts/scene.md) with Elastic Charts on a server, so a PNG or PDF of a chart looks like the Kibana panel. It mounts the [browser engine](../charts-elastic/index.md) in a jsdom window whose canvases draw through Skia (`@napi-rs/canvas`), on a worker thread, and hands back markup the `snapshot` surface and [takumi](../image-takumi/index.md) rasterize. It supports the `metric` and `xy` kinds.

```sh
npm install @elastic/isomer-charts-elastic-node @elastic/charts @napi-rs/canvas jsdom moment moment-timezone react react-dom zod
```

```ts
import { createElasticChartsNodeRenderer } from '@elastic/isomer-charts-elastic-node';

const renderer = await createElasticChartsNodeRenderer({
  fonts: [{ family: 'Inter', path: interTtf }],
});
const { html, stylesheet, width, height } = await renderer.render(scene, {
  environment: 'node',
});
await renderer.close();
```

It is a separate package from the browser engine so jsdom and Skia never reach a browser bundle. jsdom (`^20.0.1`, Kibana's pin) and `@napi-rs/canvas` are peer dependencies, like Elastic Charts and React, so a host built from Kibana shares its own and chooses its native Skia build.

## What a drawing is

`render(scene, env)` and `draw(scene, request?)` resolve to a `ChartDrawing`:

| Field | What it is |
| --- | --- |
| `html` | The chart's markup, with each canvas replaced by a PNG image of what Skia drew, sized as the canvas was |
| `stylesheet` | Elastic Charts' stylesheet for the Scene's scheme under EUI's global reset and body font, as Kibana's page gives every chart |
| `width`, `height` | The size drawn: the request's, else the Scene's `size`. A Scene with neither is refused |
| `debugState` | Elastic Charts' `DebugState`, when `draw` is asked for it with `debugState: true`: what Kibana's functional tests read, for comparing with a Kibana capture |

The markup is adjusted for takumi's CSS: grid rows sized `min-content` become `auto` and the free row `1fr`, `auto-fill` and `auto-fit` grid tracks become the count that fits the width, and a `repeat(…)` Elastic Charts' metric leaves unclosed is closed. Each is the same layout in a browser.

## The drawing thread

`createElasticChartsNodeRenderer(options)` starts one worker thread and resolves once it has loaded jsdom, React and Elastic Charts. Drawings run one at a time in posting order; the worker keeps the process alive only while one is owed. A failed drawing rejects that call and the worker keeps drawing. `close()` stops it, and later calls reject.

| Option | Default | What it does |
| --- | --- | --- |
| `fonts` | none | `{ family, path }` files registered with Skia before the first drawing. Without Kibana's `Inter` and `Elastic UI Numeric`, text measures and draws in a fallback face |
| `pixelRatio` | `2` | Device pixels per CSS pixel in the canvas images |

`createSceneDraw(options)` draws in the calling thread instead, with no second isolate. It installs a jsdom window as the thread's globals, so use it only in a process that does nothing but draw, such as a render process.

The worker reaches no jsdom selector: `getComputedStyle` returns an element's inline style, and the engine walks parents itself. jsdom's selector engine compiles selectors with `new Function`, which a server run with `--disallow-code-generation-from-strings`, as packaged Kibana is, rejects.

## Node

Tested on Node 22.13 and later, the repository's floor, and on Node 24, Kibana's version. Nothing here needs Node 24.

## Known gaps

The browser engine's [gaps and tolerances](../charts-elastic/index.md#known-gaps-and-geometry-tolerance) apply. In addition, takumi lays out the HTML parts (legend, metric tiles, axis titles drawn as DOM) with its own text layout, so their geometry is compared within tolerance; canvas parts are pixels as Skia drew them.
