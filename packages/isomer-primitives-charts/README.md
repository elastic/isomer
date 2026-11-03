# @elastic/isomer-primitives-charts

Renderer-neutral chart primitives: schemas, resolvers, theme tokens mirroring Elastic Charts, and text and Markdown adaptations. It draws nothing itself; a renderer package such as `@elastic/isomer-renderers-elastic-charts` supplies the `react` renderers.

`@elastic/isomer-primitives-charts/model` holds the schemas and resolvers with no React, DOM, Node built-ins, SDK or chart engine, so any engine can draw from it.

Read the [contract](docs/index.md) and the [metric](docs/metric.md) reference.
