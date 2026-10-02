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

Every URL-bearing field is checked against one policy. Renderers do not invent a second allow-list. The policy lives in `validate/` so untrusted parse and trusted validate share it. A URL is checked after decoding its character references once (every numeric one, with or without `;`, and `&colon;`, `&Tab;`, `&NewLine;`, `&sol;`, `&bsol;`, `&lt;`, `&gt;`), then stripping control characters; a passing URL comes back as authored, trimmed and with control characters stripped, so a consumer that decodes it decodes what was checked.[^docs]

Authored Markdown checks GFM-parsed destinations without decoding references again; source beyond the documented length and syntax budgets degrades to inert text.

Related: [composition](/sdk/concepts/composition.md), [rendering](/sdk/concepts/rendering.md).

[^docs]: URL trust
