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

Every URL-bearing field is checked against one policy, as a Zod refinement at validation and again by render-time sanitization. See the package doc on URL trust.[^docs]

Authored Markdown checks GFM-parsed destinations without decoding references again, and source beyond the documented length and syntax budgets degrades to inert text. Reference definitions are resolved at each use, with the navigation policy for a link and the asset policy for an image, so a shared definition can be valid for one and blocked for the other; a data-image definition, multiline included, stays valid for an image reference.[^docs]

Related: [composition](/sdk/concepts/composition.md), [rendering](/sdk/concepts/rendering.md).

[^docs]: URL trust
