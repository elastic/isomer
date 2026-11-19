---
type: Entry Point
title: Schema
description: '@elastic/isomer-sdk/schema React-free schema-building contract.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/entries/schema.ts
tags: [isomer, sdk, api, schema]
status: stable
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/entries/schema.ts
    title: Schema entry
---

# Definition

`./schema` exports `z`, `requiredString`, `unresolvedBodyNodeSchema`, URL rules and schemas, and the types needed to define pack schemas. It reaches zod alone; React, DOM and Node dependencies stay outside this entry.[^barrel]

Related: [pipeline](/sdk/concepts/pipeline.md).

[^barrel]: Schema entry
