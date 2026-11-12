# Static Elastic Charts instructions

Read the [root instructions](../../AGENTS.md), the [charts pack instructions](../isomer-primitives-charts/AGENTS.md) and the [Elastic Charts engine instructions](../isomer-charts-elastic/AGENTS.md) first.

## Read before changing

- What it draws, its gaps, its benchmark and its gates: [Static Elastic Charts](docs/index.md).
- The specs it draws: the browser engine's [one spec builder](../isomer-charts-elastic/docs/index.md#one-spec-builder).

## When changing this area

Source imports `@elastic/isomer-primitives-charts/scene` and the browser engine's `./engine` entry, never the engine's internals. Build no specs here: change `sceneSpecs` in the browser engine, so both draw the same chart. `@elastic/charts` is the vendored build of #2939 rebased onto #2941 in `vendor/`, and the browser engine is injected so its specs come from that build; `vitest.config.ts` aliases `@elastic/charts` to it for the same reason.

## Evidence required

Draw the affected example Scenes with `renderSceneSvg`: tick labels in its `DebugState` equal `formatAxisValue`'s and appear in the SVG, and a metric's SVG text holds each tile's title and value. The [parity gates](docs/index.md#parity-gates) (`src/parity.test.ts`, `e2e/look.spec.ts`) run over every example: a kind the renderer newly supports needs a content check and a look tolerance there, and a new gap a row in the gaps table. A change that costs memory keeps `pnpm check:memory` within the bounds in `scripts/bench_engine.cjs`. Checks every static engine shares go in the charts pack's or the Elastic Charts engine's `./testing`, not here.
