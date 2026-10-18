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

Every URL-bearing field is checked against one policy. Renderers do not invent a second allow-list. The policy lives in `validate/` so untrusted parse and trusted validate share it. A URL is checked after decoding its character references once (every numeric one, with or without `;`, and `&colon;`, `&Tab;`, `&NewLine;`, `&sol;`, `&bsol;`, `&lt;`, `&gt;`), then stripping control characters; a passing URL comes back as authored, trimmed and with control characters stripped, so a consumer that decodes it decodes what was checked. `navigationHref()` and `assetUrl()` describe themselves with their rule, since a refinement's message never reaches the authoring JSON Schema; a field with its own description ends it with `NAVIGATION_HREF_RULE` or `ASSET_URL_RULE`, and `{ max }` bounds the length.[^docs]

Authored Markdown checks GFM-parsed destinations without decoding references again, and source beyond the documented length and syntax budgets degrades to inert text. Reference definitions are resolved at each use, with the navigation policy for a link and the asset policy for an image, so a shared definition can be valid for one and blocked for the other; a data-image definition, multiline included, stays valid for an image reference.[^docs]

Slack cannot resolve a relative link, so without a base it prints its label and the link is dropped silently. `baseUrl` (an absolute `http` or `https` URL) on `renderSlackEnvelope`, the runtime's `slack` surface, `markdownContentToSlackBlocks`, `slackLinkUrl`, and `link` resolves a relative navigation href with `new URL(href, baseUrl)` after the policy passes it; the result links only on the base's origin and after passing `slackLinkUrl` again. A fragment, `BLOCKED_HREF` included, never resolves, images do not resolve, and an invalid base throws `INVALID_BASE_URL`.[^docs]

Related: [composition](/sdk/concepts/composition.md), [rendering](/sdk/concepts/rendering.md).

[^docs]: URL trust
