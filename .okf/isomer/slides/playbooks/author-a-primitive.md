---
type: Playbook
title: Author a primitive
description: Colocate renderers, read values from the theme, skip a second svg tree.
tags: [isomer, slides, playbook]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/primitives.md
    title: Authoring a primitive
---

# Steps

1. Add the primitive under `src/primitives/<type>/` with its schema as the declaration, then make the other five hand-maintained stops: `src/registry.ts` and `src/body_node.ts`, its group and any `describe` entry in `src/pack_authoring.ts`, its Distillate module in `src/stylesheet.ts`, and its theme group in `SLIDE_THEME`. `src/registry.test.ts` fails when the registry, the union, or the groups drift. Brand child fields with `fromChildren` or `fromTextChildren`. Hand-write `types.ts` only for a `schemaFor` container.
2. Put every drawn value in the primitive's theme group in `src/theme/components/` first, and read it from the folder's `styles.ts`.
3. Implement `react`, `text`, and `markdown`, and spread `nodeAnchor(context, { type })` on the `react` root. Reuse `react` for image layout. A container also implements `slack` with `renderSlackChildren`, so a native renderer below it is reached. An ordered primitive adds a `build.ts` so it reveals one part per click.
4. If you draw inside an inline `<svg>`, set literal `fill` / `stroke` alongside the class.[^docs]
5. Write `catalog.ts` for a model choosing between primitives: a reader-need `purpose`, intent-phrased `useWhen`, and an `avoidWhen` that names the alternative. Write a cross-field rule as `.check(crossRefine(…))` or `.check(crossSuperRefine(…))` so it reports beside a failing field, and restate it in `src/pack_authoring.ts`, since the JSON Schema drops it.

Related: [one source](/slides/concepts/one-source.md), [no svg renderer](/slides/concepts/no-svg-renderer.md).

[^docs]: Authoring a primitive
