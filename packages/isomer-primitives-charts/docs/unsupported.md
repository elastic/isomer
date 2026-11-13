---
navigation_title: unsupported
description: A visible placeholder for anything that could not be materialized or rendered.
---

# `unsupported`

A visible placeholder for something that could not be materialized or rendered, so nothing is dropped or approximated silently.

| Field | What it is |
| --- | --- |
| `title` | The title of what could not be shown |
| `reason` | Why, in words a reader understands |
| `link?` | `{ href, label }`, where to see it instead, such as "Open in Kibana". `href` follows the SDK's [URL policy](../../isomer-sdk/docs/url-trust.md) |
| `source?` | [Provenance](core.md#source) |

## Exports

On `./schema` and the root entry:

| Export | What it is |
| --- | --- |
| `unsupportedSchema` | The `unsupported` schema |
| `UnsupportedNode` | A validated `unsupported` node |
| `unsupportedCatalog` | What an agent reads to choose `unsupported`: purpose, when to use it, and an example |
| `unsupportedExamples` | Its named examples: with a link, and without one |
