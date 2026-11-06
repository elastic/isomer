# Elastic Charts engine instructions

Read the [root instructions](../../AGENTS.md) and the [charts pack instructions](../isomer-primitives-charts/AGENTS.md) first.

## Read before changing

- What the engine takes from the Scene, its events and its gaps: [Elastic Charts engine](docs/index.md).
- The Scene and selections: [Scene](../isomer-primitives-charts/docs/scene.md).

## When changing this area

Import only `@elastic/isomer-primitives-charts/scene`: never the schemas, a formatter, or the resolver. Feed every string and color from the Scene; where Elastic Charts cannot take a value from it, record the gap in the docs' tolerance table rather than deciding it here. Kibana defaults (theme, styles, legend sizes) come from Kibana's source, cited where they are ported. Build specs only in `sceneSpecs`: the browser renderer and the headless one (`./headless`) both draw from it, so a chart drawn in a browser and one drawn on a server cannot drift.

## Evidence required

Draw the affected example Scenes in jsdom and read Elastic Charts' `DebugState` (or the page, for the metric chart): strings and colors equal the Scene's. For `./headless`, draw them with `renderSceneSvg`: axis labels in its `DebugState` are Scene labels and appear in the SVG, and a metric's SVG text holds each tile's title and value. Events from engine callbacks equal `chartEventExamples` or other expectations built from the node's data, not from this package.
