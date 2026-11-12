# Static Elastic Charts instructions

Read the [root instructions](../../AGENTS.md), the [charts pack instructions](../isomer-primitives-charts/AGENTS.md) and the [Elastic Charts engine instructions](../isomer-charts-elastic/AGENTS.md) first.

## Read before changing

- What it draws, how it runs on Node, its gaps, its benchmark and its gates: [Static Elastic Charts](docs/index.md).

## When changing this area

Source imports `@elastic/isomer-primitives-charts/scene` and the browser engine's root and `./engine` entries, never the engine's internals. Draw no chart here: it mounts the browser engine's renderer, switching only its `<Chart>` to `renderer="svg"`, so both draw the same chart. `@elastic/charts` is the vendored #2941 build in `vendor/`, and the browser engine is injected so its specs come from that build; `vitest.config.ts` aliases `@elastic/charts` to it for the same reason. Reach no jsdom selector (`querySelector`, `matches`, a stylesheet cascade): they fail under `--disallow-code-generation-from-strings`. Install the window's globals only for the length of a draw.

## Evidence required

The [parity gates](docs/index.md#parity-gates) (`src/parity.test.ts`, `e2e/look.spec.ts`) run over every example. Checks every static engine shares go in the charts pack's or the Elastic Charts engine's `./testing`, not here. A change that costs memory keeps `pnpm check:memory` within the bounds in `scripts/bench_engine.cjs`.
