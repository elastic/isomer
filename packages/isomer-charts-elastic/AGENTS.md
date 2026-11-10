# Elastic Charts engine instructions

Read the [root instructions](../../AGENTS.md) and the [charts pack instructions](../isomer-primitives-charts/AGENTS.md) first.

## Read before changing

- What the engine takes from the Scene, its events and its gaps: [Elastic Charts engine](docs/index.md).
- The Scene and selections: [Scene](../isomer-primitives-charts/docs/scene.md).

## When changing this area

Source imports only `@elastic/isomer-primitives-charts/scene`: never the schemas, a formatter, or the resolver. Feed every string and color from the Scene, and print tick labels through `formatAxisValue`, except a Scene time axis's, which Elastic Charts' multi-layer axis draws and must equal the Scene's `timeTicks`; where Elastic Charts cannot take a value from it, record the gap in the docs' tolerance table rather than deciding it here. Kibana defaults (theme, styles, legend sizes) come from Kibana's source, cited where they are ported. Build specs only in `sceneSpecs`: the browser renderer and the headless one (`./headless`) both draw from it, so a chart drawn in a browser and one drawn on a server cannot drift.

## Evidence required

Draw the affected example Scenes, and every schema example through `resolveChart`, in jsdom and read Elastic Charts' `DebugState` (or the page, for the metric chart): strings and colors equal the Scene's, and tick labels equal `formatAxisValue`'s, or a time axis's `timeTicks`. For `./headless`, draw them with `renderSceneSvg`: tick labels in its `DebugState` equal `formatAxisValue`'s, or the `timeTicks` band at the drawn plot width, and appear in the SVG, and a metric's SVG text holds each tile's title and value. Events from engine callbacks equal `chartEventExamples` or other expectations built from the node's data, not from this package. The [parity gates](docs/index.md#parity-gates) (`src/parity.test.ts`, `e2e/look.spec.ts`) run over every example: a kind the engine newly supports needs a content check and a look tolerance there, and a new gap a row in the tolerance table.
