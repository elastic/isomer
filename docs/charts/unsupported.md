---
navigation_title: unsupported
description: A visible placeholder for anything that could not be materialized or rendered.
---

# `unsupported`

A visible placeholder for something that could not be materialized or rendered, so nothing is dropped or approximated silently.

## Example

The fewest fields that validate and draw, a title and a reason:

<!-- node-example -->

```ts
import type { UnsupportedNode } from '@elastic/isomer-primitives-charts/schema';

const timedOut: UnsupportedNode = {
  type: 'unsupported',
  title: 'Response codes over time',
  reason: 'The query timed out after 30 seconds.',
};
```

A typical placeholder, for a panel type that cannot be shown, linking to its source:

<!-- node-example -->

```ts
import type { UnsupportedNode } from '@elastic/isomer-primitives-charts/schema';

const visitorsByOs: UnsupportedNode = {
  type: 'unsupported',
  title: '[Logs] Visitors by OS',
  reason: 'Vega visualizations cannot be shown here yet.',
  link: {
    href: 'https://kibana.example.com/app/dashboards#/view/edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b',
    label: 'Open in Kibana',
  },
};
```

## Fields

| Field | What it is |
| --- | --- |
| `title` | The title of what could not be shown |
| `reason` | Why, in words a reader understands |
| `link?` | `{ href, label }`, where to see it instead, such as "Open in Kibana". `href` follows the SDK's [URL policy](../sdk/url-trust.md) |
| `source?` | [Provenance](core.md#source) |
