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

Declare the schema, write a catalog entry and examples, implement the `react`, `text`, and `markdown` renderers, and call `definePrimitive`. See the package doc on the primitive contract.[^docs]

- Add Slack only when Block Kit needs more than the markdown fallback.
- Put theme literals in the pack theme, not in the primitive.[^define]

Related: [primitives](/sdk/concepts/primitives.md), [define a pack](/sdk/playbooks/define-a-pack.md).

[^docs]: Primitive contract

[^define]: define stage
