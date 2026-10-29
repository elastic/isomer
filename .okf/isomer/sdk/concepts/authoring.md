---
type: Concept
title: Authoring
description: JSX and agent prompt assembly. Structural context comes from the runtime.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/authoring.md
tags: [isomer, sdk, authoring]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/authoring.md
    title: Authoring
  - id: author
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/author
    title: author stage
---

# Definition

`buildJsxShim` turns a pack's primitive schemas into a typed JSX front end, and `buildAuthoringPrompt` assembles a model's prompt from a pack's guide and rules plus the runtime's [authoring context](/runtime/concepts/authoring-context.md). See the package doc on authoring.[^docs]

Related: [primitives](/sdk/concepts/primitives.md), [entry point author](/sdk/entry-points/author.md).

[^docs]: Authoring
