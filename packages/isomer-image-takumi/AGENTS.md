# Takumi backend instructions

Read the [root instructions](../../AGENTS.md) first.

## Read before changing

- Input and dependency boundaries: [What it is](docs/index.md#what-it-is) and the [runtime snapshot boundary](../isomer-runtime/docs/surfaces.md#a-snapshot-stops-at-markup-and-a-stylesheet).
- Geometry and measurement: [Scaling and rounding](docs/index.md#what-it-is), [Sizing to content](docs/index.md#sizing-to-content), and [Measuring a layout](docs/index.md#measuring-a-layout).
- Runtime convenience helpers: [PNG helper](docs/index.md#rendering-a-whole-runtime-call-in-one-step) and [Rendering a PDF](docs/index.md#rendering-a-pdf).
- Worker or resource changes: [Off the calling thread](docs/index.md#off-the-calling-thread), [Fonts](docs/index.md#fonts), and [Determinism](docs/index.md#determinism).

## When changing this area

Trace affected rendering, measurement, fitting, and convenience-helper paths. Check geometry in consumer-visible units.

## Evidence required

For output changes, inspect a rendered artifact and assert affected dimensions, content, clipping, or page count; fix fonts/metadata where needed.

For packaging changes, check [installed CommonJS asset resolution](../../CONTRIBUTING.md#the-build). For worker lifecycle changes, exercise affected call settlement, close/restart, failure recovery, and process-exit behavior.
