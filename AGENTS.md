# Agent instructions

Canonical, tool-agnostic instructions for any coding agent working in this repository.

Isomer turns one typed `Composition` into React, HTML, SVG, PNG, Slack Block Kit, Markdown, and plain text. It owns the composition contract, primitive catalog, validation, and rendering; hosts own data, authorization, routing, and side effects.

The runtime lives in `packages/isomer-runtime` under `assemble/`, `registry/`, and `surfaces/`. Stage barrels there are hand-maintained the same way as the SDK's.

`packages/isomer-primitives-slides` is the in-repo reference pack. Its `src/registry.ts` and `src/body_node.ts` are hand-maintained the same way, and `src/registry.test.ts` fails when they drift. Its docs live in `packages/isomer-primitives-slides/docs/`. Primitive packs for Kibana iterate in that repo.

`packages/isomer-image-takumi` rasterizes the `svg` surface's output to PNG or SVG. It depends on no isomer package — it declares the surface's result shape structurally.

## Release posture

The release units are `@elastic/isomer-sdk` and `@elastic/isomer-runtime`. `@elastic/isomer-primitives-slides` and `@elastic/isomer-image-takumi` are `private: true` because they are not release units: slides is the in-repo reference pack, takumi is a host-side rasterizer. That is settled. Do not raise publication, registry access, or dependency licensing as a constraint when planning work in this repository.

## Where work happens

This repository is the source of truth for Isomer. Earlier prototypes and host-side integrations are references, not destinations: when they disagree with the code and docs here, this repository wins.

## Verify your work

```sh
pnpm verify
```

That is the complete local gate. If a check fails in a way that looks unrelated to your change, say so rather than papering over it.

## Conventions

- Conventional commits. `feat:` and `fix:` are release-driving.
- License headers are the Elastic License 2.0 block, enforced by ESLint (`license-header/header`). Use `pnpm lint:fix` rather than inserting them by hand. `.yml`/`.yaml` headers are hand-maintained.
- Brands use `Symbol.for`, never bare `Symbol()`.
- `IsomerError` is identified by `name` and `code`, never `instanceof`. `CompositionValidationError` is identified by `name`, `code`, and `errors`.
- Stage barrels (`packages/isomer-sdk/src/<stage>/index.ts`) are hand-maintained. When you add or remove an export from a module, update the barrel in the same commit. TypeScript enforces correctness; keeping them alphabetically sorted keeps diffs readable.
- `src/entries/*` are hand-curated on purpose: which names reach which subpath is what keeps `react-dom/server` off the root entry.
- `zod` is a peer dependency. Do not add it to `dependencies`.
- The sdk must not import the runtime.
- No cross-package tsconfig `paths`. Internal resolution is `workspace:*` plus TypeScript project references. The one `paths` entry in the repo redirects an *external* package's subpath types for the CommonJS pass, whose `Node10` resolution cannot read an `exports` map; it is not a route between workspace packages.
- Do not invent a bundler for the library build. `tsc` plus `tsc-alias` is the toolchain, with a second `tsc` pass for CommonJS.
- After adding or changing a dependency, run `pnpm licenses:report` and include the updated `THIRD_PARTY_LICENSES.md` and `NOTICE.txt`.
- Narrative docs live in each package's `docs/`. Root `docs/` is the docs-builder assembler (landing page and OKF map); do not author package pages there. Preview with `pnpm docs:dev`; CI copies then builds.
- When public API, docs, examples, or behavior change, update `.okf/isomer`, run `pnpm okf:check` and `pnpm okf:index`, and record meaningful changes in `.okf/isomer/log.md`.
- `.okf/**` is excluded from markdown and Prettier formatting because `okf index` owns generated index formatting.
- Keep comments short. Do not narrate decisions that git history already records.
- A pack holds no rendered value of its own: every number, length, ratio, and glyph it draws has one authoring source in its theme ([Before you add a value](packages/isomer-primitives-slides/docs/primitives.md#before-you-add-a-value-one-source-per-rendered-value)).
- There is no per-primitive `svg` renderer. The image surface dispatches to `react` and is handed the pack's stylesheet; do not reintroduce a second tree authored for image layout.
- The pack stylesheet does not reach inside an inline `<svg>`. Anything drawn there needs a literal `fill` / `stroke` alongside its class ([Drawing inside an `svg`](packages/isomer-primitives-slides/docs/primitives.md#drawing-inside-an-svg)).
