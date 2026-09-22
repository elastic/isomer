---
type: Concept
title: URL trust
description: The one policy every URL-bearing field goes through.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/url-trust.md
tags: [isomer, sdk, security]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/url-trust.md
    title: URL trust
---

# Definition

Every URL-bearing field is checked against one policy. Renderers do not invent a second allow-list. The policy lives in `validate/` so untrusted parse and trusted validate share it.[^docs]

Related: [composition](/sdk/concepts/composition.md), [rendering](/sdk/concepts/rendering.md).

[^docs]: URL trust
