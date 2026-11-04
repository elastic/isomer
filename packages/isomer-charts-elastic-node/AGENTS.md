# Elastic Charts engine for Node instructions

Read the [root instructions](../../AGENTS.md) and the [Elastic Charts engine instructions](../isomer-charts-elastic/AGENTS.md) first.

## Read before changing

- The drawing, the worker and the markup adjustments: [Elastic Charts engine for Node](docs/index.md).
- What the markup must lay out in: [takumi](../isomer-image-takumi/docs/index.md).

## When changing this area

Mapping a Scene to Elastic Charts belongs to `@elastic/isomer-charts-elastic`; this package only hosts it. Keep the worker within `--disallow-code-generation-from-strings`: never reach jsdom's selector engine. Load React DOM and the engine through `worker_file.cjs`'s `require`, so Node gets their CommonJS builds from either build of this package. Host styles come from EUI; `host_styles.test.ts` compares them with EUI's own.

## Evidence required

Draw the affected example Scenes, read the `DebugState` or markup, and rasterize them with takumi: the Scene's strings and colors must come through. Exercise the worker for start, failure, ordering and close.
