---
type: Concept
title: Primitives
description: definePrimitive binds schema, catalog, examples, and per-surface renderers into one definition.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/define
tags: [isomer, sdk, primitives]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.7, at: 2026-09-22T16:30:00Z }
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/primitives.md
    title: Primitive contract
  - id: define
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/define
    title: define stage
---

# Definition

`definePrimitive` is the primitive contract: a `type`, a catalog entry, examples, a zod schema, and renderers. The schema is the declaration; the node type is `z.infer` unless the primitive declares `schemaFor`, which hand-writes its type because it holds the body-node union. Leave the type arguments inferred so field brands survive. The catalog `example` is what the prompt inlines. `examples` is the conformance set and stays off the prompt. React, text, and markdown are required. `svg` is not a renderer a primitive writes — the image surface reuses `react`. Slack may be declared; otherwise the dispatcher converts markdown to Block Kit.[^docs][^define]

Optional hooks include `collectStyles` for HTML CSS and metrics for layout. A primitive holds no theme literals of its own; those belong to the pack's theme.

Related: [packs](/sdk/concepts/packs.md), [define a primitive](/sdk/playbooks/define-a-primitive.md), [rendering](/sdk/concepts/rendering.md).

[^docs]: Primitive contract

[^define]: define stage
