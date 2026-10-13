---
type: Concept
title: Config contract
description: A Studio config supplies a runtime, and optionally a title, createReactContext and compose.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/config.ts
tags: [isomer, studio]
status: stable
stale_after: 2027-04-07
sources:
  - id: config
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/config.ts
    title: Config types
  - id: compose
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/model/compose_example.ts
    title: composeExample
---

# Definition

A config default-exports `defineStudioConfig({ runtime, title?, createReactContext?, compose? })`. `createReactContext(root)` styles the React preview inside a shadow root; without it the React preview shows the `html` surface. `compose(nodes, { theme })` wraps example nodes in a composition and defaults to `{ type: 'view', body: nodes, theme }`; `theme` is the app's color mode, so previews match the chrome. `title` replaces `Isomer Studio` in the header, the page title, and the `check` report name.[^config]

`composeExample` is the one place a composition is built from examples, so a pack whose frame needs a particular root (the slides frame needs one `slideFrame`) writes the envelope once.[^compose]

Surfaces come from `runtime.surfaces`: without a `snapshot` surface there are no Snapshot or PNG previews.

[^config]: Config types
[^compose]: composeExample
