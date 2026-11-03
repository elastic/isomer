---
type: Entry Point
title: Author
description: '@elastic/isomer-sdk/author schema brands, JSX shim, and authoring prompt.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/author/index.ts
tags: [isomer, sdk, api, author]
status: stable
stale_after: 2027-03-18
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/author/index.ts
    title: Author barrel
---

# Definition

`@elastic/isomer-sdk/author` holds the schema brands, the JSX shim and printers, editor declarations, and the authoring prompt. See [`./author`](https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/api.md#author) in the API reference and the [authoring doc](https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/authoring.md).

`printCompositionJsx(body, env, { root })` also prints a composition's `version`, `title`, `subtitle`, `theme` and `meta` as `<Composition>` props (`PrintCompositionRoot`), even over an empty body. A key that is not a JSX attribute name prints as a quoted spread (`{...{ "a b": 1 }}`), and a type that is not a Unicode identifier path (`Café` is one) throws `UNKNOWN_PRIMITIVE_TYPE`, so printed JSX never carries syntax from the data. Catalog and registered-view lines collapse each whitespace run holding a line terminator to one space.[^barrel]

Related: [authoring](/sdk/concepts/authoring.md), [authoring context](/runtime/concepts/authoring-context.md).

[^barrel]: Author barrel
