---
type: Playbook
title: Define a primitive
description: Bind schema, catalog, examples, and renderers with definePrimitive.
tags: [isomer, sdk, playbook]
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

# Steps

1. Declare the primitive in its zod schema and export `z.infer` as the node type. Hand-write the type only when the primitive declares `schemaFor`.
2. Write a catalog entry (`purpose`, `useWhen`, `avoidWhen`, `example`) and at least one example.
3. Implement `react`, `text`, and `markdown` renderers. Add Slack only when Block Kit needs more than the markdown fallback.
4. Call `definePrimitive`. Put theme literals in the pack theme, not in the primitive.[^docs][^define]

Related: [primitives](/sdk/concepts/primitives.md), [define a pack](/sdk/playbooks/define-a-pack.md).

[^docs]: Primitive contract

[^define]: define stage
