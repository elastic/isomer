---
navigation_title: The config
description: What an isomer-studio.config.ts exports, and how compose wraps examples.
---

# The config

A config file default-exports `defineStudioConfig({ ... })`. `defineStudioConfig` returns its argument; it exists so the object is typed. Beside it, the package exports the `StudioConfig`, `StudioCompose`, `StudioRuntime` and `StudioTheme` types.

| Field | Required | What it does |
| --- | --- | --- |
| `runtime` | Yes | The runtime from `createIsomerRuntime`. Its packs are what the Studio lists, and its surfaces are the previews it offers. |
| `title` | No | Replaces the header, the page title, and the `check` report name. Defaults to `Isomer Studio`. |
| `createReactContext(root)` | No | Styles the React preview, which renders inside a shadow root: add the pack's stylesheet to `root` and return the render context its renderers expect. Without it, the React preview shows the `html` surface instead. |
| `compose(nodes, { theme })` | No | Wraps example nodes in a composition. Defaults to `{ type: 'view', body: nodes, theme }`. |

## `compose`

Examples are nodes, not compositions. Every place the Studio needs a composition, `compose` builds it, so a pack writes the envelope once and every preview agrees on it.

The default fits a pack whose primitives render inside a plain `view`. A pack whose frame requires a particular root writes its own. The slides frame draws exactly one `slideFrame`, so the slides `compose` wraps a lone node in a preview slide, and passes a node that is already a `slideFrame` through unwrapped.

`compose` receives the theme the Studio is showing, `light` or `dark`, and puts it on the composition, so previews match the chrome around them.

## Surfaces a runtime may lack

The Studio offers the surfaces `runtime.surfaces` has. A runtime without a frame has no `snapshot` surface, so it gets no Snapshot or PNG previews.
