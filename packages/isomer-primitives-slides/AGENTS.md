# Slides reference pack instructions

Read the [root instructions](../../AGENTS.md) first.

## Read before changing

- Any primitive: [Authoring a primitive](docs/primitives.md), including shared helpers and SVG conventions.
- Pack registration or examples: [Pack contract](docs/contract.md).
- Design values, fit, or geometry: [Theme](docs/theme.md), [Styling](docs/styling.md), and [Document](docs/document.md).
- Interaction or authoring copy: [Builds](docs/builds.md) and [Copy](docs/copy.md).

## When changing this area

Check registry, body-node union, authoring groups, and exports against primitive directories: two matching lists can omit the same primitive. For fit changes, identify the frame, theme, and available room.

## Evidence required

Use affected primitive, registry, conformance, content-parity, marks, theme, and Slack-limit coverage. Validate new examples.

For visual changes, inspect the affected browser or rasterized artifact in relevant themes. Use [the worked example](docs/example.md) and snapshot checks when affected; account for platform and font limitations.
