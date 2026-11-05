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
| `link?` | `{ href, label }`, where to see it instead, such as "Open in Kibana". `href` follows the SDK's [URL policy](../sdk/url-trust.md) |
| `source?` | [Provenance](core.md#source) |
