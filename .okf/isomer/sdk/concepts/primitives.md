---
type: Concept
title: Primitives
description: definePrimitive binds schema, catalog, examples, and per-surface renderers into one definition.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/define
tags: [isomer, sdk, primitives]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/primitives.md
    title: Primitive contract
  - id: define
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/define
    title: define stage
---

# Definition

`definePrimitive` is the primitive contract: a `type`, a catalog entry, examples, a zod schema, and renderers. The schema is the declaration; the node type is `z.infer` unless the primitive declares `schemaFor`, which hand-writes its type because it holds the body-node union. `definePrimitive` adds optional `id` and `surfaces` to the schema; a schema that declares either itself throws `RESERVED_NODE_FIELD`. Leave the type arguments inferred so field brands survive. The catalog `example` is what the prompt inlines. `examples` is the conformance set and stays off the prompt. An entry is a node or a `PrimitiveExample` (`{ name, description?, node }`) whose name is non-empty and unique within the primitive, which inventory conformance checks; hosts read them through `exampleNodes` or `primitiveExamples`, and `ExampleNode` unwraps an entry's node type. React, text, and markdown are required. `svg` is not a renderer a primitive writes — the image surface reuses `react`. Slack may be declared; otherwise the dispatcher converts markdown to Block Kit.[^docs][^define]

Optional hooks include `collectStyles` for HTML CSS and metrics for layout. A primitive holds no theme literals of its own; those belong to the pack's theme.

Two optional fields are for hosts that list primitives and never reach the model. `catalog.name` (`Stat group`) is the one host-facing catalog field: the authoring prompt does not print it, and inventory conformance rejects a blank one. `icon` (`PrimitiveIcon`, `{ svg }`) is a static 16×16 SVG a host inlines as markup, so its rules are an allowlist that `assertPackIconsValid` from `./testing` enforces: one `<svg viewBox="0 0 16 16">` root without `width` or `height`, shape elements only, geometry and paint attributes only, and every `fill` and `stroke` either `none`, `currentColor`, or one of `ICON_VARS` (`--isomer-icon-accent`, `-bg`, `-fg`, `-muted`) with an optional `currentColor` or hex fallback. A hex fallback is the author's default look; a host overrides it by setting the variables, the pattern of [kibana#221938](https://github.com/elastic/kibana/issues/221938). Icon geometry and fallbacks are exempt from the no-theme-literals rule, because the pack never draws them.[^docs][^define]

Related: [packs](/sdk/concepts/packs.md), [define a primitive](/sdk/playbooks/define-a-primitive.md), [rendering](/sdk/concepts/rendering.md).

[^docs]: Primitive contract

[^define]: define stage
