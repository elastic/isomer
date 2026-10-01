---
navigation_title: slideCode
---

# `slideCode`

Show the reader real source, with the lines that matter marked, or trace one value from the file that sets it to the file that reads it.

## Use when

- The point of the slide is a specific snippet: a config, a schema, a call.
- You want to show where a value is defined and where it is used, as two panels joined by an arrow.

## Avoid when

- The code is a back-and-forth between a person, a model, and a program; use slideTranscript.
- The snippet needs more than sixteen lines; cut it down, or name the files with slideTree.
- The point is what a change did to the code, lines added and removed; use slideDiff.
- The snippet is one shell command for the audience to run; use slideCommand.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideCode example 1, light](images/slide-code-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideCode example 1, dark](images/slide-code-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
**refund.ts**

```ts
export const refund = async (order: Order) => {
  await ledger.write(order.id, -order.total);
  await fraud.check(order);
  return notify(order.customer);
};
```
````

:::

:::{tab-item} Text
:sync: text

```text
refund.ts
export const refund = async (order: Order) => {
  await ledger.write(order.id, -order.total);
  await fraud.check(order);
  return notify(order.customer);
};
```

:::

:::{tab-item} Slack
:sync: slack

````json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "refund.ts\n```\nexport const refund = async (order: Order) => {\n  await ledger.write(order.id, -order.total);\n  await fraud.check(order);\n  return notify(order.customer);\n};\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22refund.ts%5Cn%60%60%60%5Cnexport%20const%20refund%20%3D%20async%20(order%3A%20Order)%20%3D%3E%20%7B%5Cn%20%20await%20ledger.write(order.id%2C%20-order.total)%3B%5Cn%20%20await%20fraud.check(order)%3B%5Cn%20%20return%20notify(order.customer)%3B%5Cn%7D%3B%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideCode",
  "panels": [
    {
      "file": "refund.ts",
      "language": "ts",
      "lines": [
        "export const refund = async (order: Order) => {",
        "  await ledger.write(order.id, -order.total);",
        "  await fraud.check(order);",
        "  return notify(order.customer);",
        "};"
      ],
      "highlightLines": [
        2
      ]
    }
  ]
}
```

:::

::::

### Example 2

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideCode example 2, light](images/slide-code-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideCode example 2, dark](images/slide-code-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
```
npm run release -- --dry-run

npm run release
```
````

:::

:::{tab-item} Text
:sync: text

```text
npm run release -- --dry-run

npm run release
```

:::

:::{tab-item} Slack
:sync: slack

````json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "```\nnpm run release -- --dry-run\n\nnpm run release\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%60%60%60%5Cnnpm%20run%20release%20--%20--dry-run%5Cn%5Cnnpm%20run%20release%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideCode",
  "panels": [
    {
      "lines": [
        "npm run release -- --dry-run",
        "",
        "npm run release"
      ]
    }
  ]
}
```

:::

::::

### Example 3

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideCode example 3, light](images/slide-code-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideCode example 3, dark](images/slide-code-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
**config.yaml**

```yaml
checkout:
  timeout: 30s
  retries: 3
```

→

**client.ts**

```ts
const client = createClient({
  timeout: config.checkout.timeout,
  retries: config.checkout.retries,
});
```
````

:::

:::{tab-item} Text
:sync: text

```text
config.yaml
checkout:
  timeout: 30s
  retries: 3

→

client.ts
const client = createClient({
  timeout: config.checkout.timeout,
  retries: config.checkout.retries,
});
```

:::

:::{tab-item} Slack
:sync: slack

````json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "config.yaml\n```\ncheckout:\n  timeout: 30s\n  retries: 3\n```"
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "→"
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "client.ts\n```\nconst client = createClient({\n  timeout: config.checkout.timeout,\n  retries: config.checkout.retries,\n});\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22config.yaml%5Cn%60%60%60%5Cncheckout%3A%5Cn%20%20timeout%3A%2030s%5Cn%20%20retries%3A%203%5Cn%60%60%60%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%E2%86%92%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22client.ts%5Cn%60%60%60%5Cnconst%20client%20%3D%20createClient(%7B%5Cn%20%20timeout%3A%20config.checkout.timeout%2C%5Cn%20%20retries%3A%20config.checkout.retries%2C%5Cn%7D)%3B%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideCode",
  "panels": [
    {
      "file": "config.yaml",
      "language": "yaml",
      "lines": [
        "checkout:",
        "  timeout: 30s",
        "  retries: 3"
      ],
      "highlightLines": [
        2
      ]
    },
    {
      "file": "client.ts",
      "language": "ts",
      "lines": [
        "const client = createClient({",
        "  timeout: config.checkout.timeout,",
        "  retries: config.checkout.retries,",
        "});"
      ],
      "highlightLines": [
        2
      ]
    }
  ]
}
```

:::

::::

### Example 4

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideCode example 4, light](images/slide-code-4-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideCode example 4, dark](images/slide-code-4-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
**An order, as the ledger stores it**

```json
{
  "id": "ord_4821",
  "customer": "cus_190",
  "status": "refunded",

  "items": [
    { "sku": "OAT-1L", "qty": 2 },
    { "sku": "EGG-12", "qty": 1 }
  ],
  "total": 1149,
  "currency": "EUR",
  "refund": {
    "amount": 1149,
    "settled": "2026-03-02"
  }
}
```
````

:::

:::{tab-item} Text
:sync: text

```text
An order, as the ledger stores it
{
  "id": "ord_4821",
  "customer": "cus_190",
  "status": "refunded",

  "items": [
    { "sku": "OAT-1L", "qty": 2 },
    { "sku": "EGG-12", "qty": 1 }
  ],
  "total": 1149,
  "currency": "EUR",
  "refund": {
    "amount": 1149,
    "settled": "2026-03-02"
  }
}
```

:::

:::{tab-item} Slack
:sync: slack

````json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "An order, as the ledger stores it\n```\n{\n  \"id\": \"ord_4821\",\n  \"customer\": \"cus_190\",\n  \"status\": \"refunded\",\n\n  \"items\": [\n    { \"sku\": \"OAT-1L\", \"qty\": 2 },\n    { \"sku\": \"EGG-12\", \"qty\": 1 }\n  ],\n  \"total\": 1149,\n  \"currency\": \"EUR\",\n  \"refund\": {\n    \"amount\": 1149,\n    \"settled\": \"2026-03-02\"\n  }\n}\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22An%20order%2C%20as%20the%20ledger%20stores%20it%5Cn%60%60%60%5Cn%7B%5Cn%20%20%5C%22id%5C%22%3A%20%5C%22ord_4821%5C%22%2C%5Cn%20%20%5C%22customer%5C%22%3A%20%5C%22cus_190%5C%22%2C%5Cn%20%20%5C%22status%5C%22%3A%20%5C%22refunded%5C%22%2C%5Cn%5Cn%20%20%5C%22items%5C%22%3A%20%5B%5Cn%20%20%20%20%7B%20%5C%22sku%5C%22%3A%20%5C%22OAT-1L%5C%22%2C%20%5C%22qty%5C%22%3A%202%20%7D%2C%5Cn%20%20%20%20%7B%20%5C%22sku%5C%22%3A%20%5C%22EGG-12%5C%22%2C%20%5C%22qty%5C%22%3A%201%20%7D%5Cn%20%20%5D%2C%5Cn%20%20%5C%22total%5C%22%3A%201149%2C%5Cn%20%20%5C%22currency%5C%22%3A%20%5C%22EUR%5C%22%2C%5Cn%20%20%5C%22refund%5C%22%3A%20%7B%5Cn%20%20%20%20%5C%22amount%5C%22%3A%201149%2C%5Cn%20%20%20%20%5C%22settled%5C%22%3A%20%5C%222026-03-02%5C%22%5Cn%20%20%7D%5Cn%7D%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideCode",
  "panels": [
    {
      "file": "An order, as the ledger stores it",
      "language": "json",
      "lines": [
        "{",
        "  \"id\": \"ord_4821\",",
        "  \"customer\": \"cus_190\",",
        "  \"status\": \"refunded\",",
        "",
        "  \"items\": [",
        "    { \"sku\": \"OAT-1L\", \"qty\": 2 },",
        "    { \"sku\": \"EGG-12\", \"qty\": 1 }",
        "  ],",
        "  \"total\": 1149,",
        "  \"currency\": \"EUR\",",
        "  \"refund\": {",
        "    \"amount\": 1149,",
        "    \"settled\": \"2026-03-02\"",
        "  }",
        "}"
      ],
      "highlightLines": [
        4,
        13
      ]
    }
  ]
}
```

:::

::::

### Example 5

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideCode example 5, light](images/slide-code-5-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideCode example 5, dark](images/slide-code-5-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
**order.json**

```json
{
  "id": "ord_4821",
  "customer": "cus_190",
  "status": "refunded",

  "items": [
    { "sku": "OAT-1L", "qty": 2 },
    { "sku": "EGG-12", "qty": 1 }
  ],
  "total": 1149,
  "currency": "EUR",
  "refund": {
    "amount": 1149,
    "settled": "2026-03-02"
  }
}
```

→

**refund.ts**

```ts
const refund = async (id) => {
  const order = await load(id);
  if (order.status !== "paid") {
    return;
  }

  await ledger.write({
    id: order.id,
    amount: -order.total,
  });
  await payments.refund({
    order: order.id,
    amount: order.total,
  });
  return notify(order.customer);
};
```
````

:::

:::{tab-item} Text
:sync: text

```text
order.json
{
  "id": "ord_4821",
  "customer": "cus_190",
  "status": "refunded",

  "items": [
    { "sku": "OAT-1L", "qty": 2 },
    { "sku": "EGG-12", "qty": 1 }
  ],
  "total": 1149,
  "currency": "EUR",
  "refund": {
    "amount": 1149,
    "settled": "2026-03-02"
  }
}

→

refund.ts
const refund = async (id) => {
  const order = await load(id);
  if (order.status !== "paid") {
    return;
  }

  await ledger.write({
    id: order.id,
    amount: -order.total,
  });
  await payments.refund({
    order: order.id,
    amount: order.total,
  });
  return notify(order.customer);
};
```

:::

:::{tab-item} Slack
:sync: slack

````json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "order.json\n```\n{\n  \"id\": \"ord_4821\",\n  \"customer\": \"cus_190\",\n  \"status\": \"refunded\",\n\n  \"items\": [\n    { \"sku\": \"OAT-1L\", \"qty\": 2 },\n    { \"sku\": \"EGG-12\", \"qty\": 1 }\n  ],\n  \"total\": 1149,\n  \"currency\": \"EUR\",\n  \"refund\": {\n    \"amount\": 1149,\n    \"settled\": \"2026-03-02\"\n  }\n}\n```"
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "→"
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "refund.ts\n```\nconst refund = async (id) => {\n  const order = await load(id);\n  if (order.status !== \"paid\") {\n    return;\n  }\n\n  await ledger.write({\n    id: order.id,\n    amount: -order.total,\n  });\n  await payments.refund({\n    order: order.id,\n    amount: order.total,\n  });\n  return notify(order.customer);\n};\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22order.json%5Cn%60%60%60%5Cn%7B%5Cn%20%20%5C%22id%5C%22%3A%20%5C%22ord_4821%5C%22%2C%5Cn%20%20%5C%22customer%5C%22%3A%20%5C%22cus_190%5C%22%2C%5Cn%20%20%5C%22status%5C%22%3A%20%5C%22refunded%5C%22%2C%5Cn%5Cn%20%20%5C%22items%5C%22%3A%20%5B%5Cn%20%20%20%20%7B%20%5C%22sku%5C%22%3A%20%5C%22OAT-1L%5C%22%2C%20%5C%22qty%5C%22%3A%202%20%7D%2C%5Cn%20%20%20%20%7B%20%5C%22sku%5C%22%3A%20%5C%22EGG-12%5C%22%2C%20%5C%22qty%5C%22%3A%201%20%7D%5Cn%20%20%5D%2C%5Cn%20%20%5C%22total%5C%22%3A%201149%2C%5Cn%20%20%5C%22currency%5C%22%3A%20%5C%22EUR%5C%22%2C%5Cn%20%20%5C%22refund%5C%22%3A%20%7B%5Cn%20%20%20%20%5C%22amount%5C%22%3A%201149%2C%5Cn%20%20%20%20%5C%22settled%5C%22%3A%20%5C%222026-03-02%5C%22%5Cn%20%20%7D%5Cn%7D%5Cn%60%60%60%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%E2%86%92%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22refund.ts%5Cn%60%60%60%5Cnconst%20refund%20%3D%20async%20(id)%20%3D%3E%20%7B%5Cn%20%20const%20order%20%3D%20await%20load(id)%3B%5Cn%20%20if%20(order.status%20!%3D%3D%20%5C%22paid%5C%22)%20%7B%5Cn%20%20%20%20return%3B%5Cn%20%20%7D%5Cn%5Cn%20%20await%20ledger.write(%7B%5Cn%20%20%20%20id%3A%20order.id%2C%5Cn%20%20%20%20amount%3A%20-order.total%2C%5Cn%20%20%7D)%3B%5Cn%20%20await%20payments.refund(%7B%5Cn%20%20%20%20order%3A%20order.id%2C%5Cn%20%20%20%20amount%3A%20order.total%2C%5Cn%20%20%7D)%3B%5Cn%20%20return%20notify(order.customer)%3B%5Cn%7D%3B%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideCode",
  "panels": [
    {
      "file": "order.json",
      "language": "json",
      "lines": [
        "{",
        "  \"id\": \"ord_4821\",",
        "  \"customer\": \"cus_190\",",
        "  \"status\": \"refunded\",",
        "",
        "  \"items\": [",
        "    { \"sku\": \"OAT-1L\", \"qty\": 2 },",
        "    { \"sku\": \"EGG-12\", \"qty\": 1 }",
        "  ],",
        "  \"total\": 1149,",
        "  \"currency\": \"EUR\",",
        "  \"refund\": {",
        "    \"amount\": 1149,",
        "    \"settled\": \"2026-03-02\"",
        "  }",
        "}"
      ],
      "highlightLines": [
        4,
        13
      ]
    },
    {
      "file": "refund.ts",
      "language": "ts",
      "lines": [
        "const refund = async (id) => {",
        "  const order = await load(id);",
        "  if (order.status !== \"paid\") {",
        "    return;",
        "  }",
        "",
        "  await ledger.write({",
        "    id: order.id,",
        "    amount: -order.total,",
        "  });",
        "  await payments.refund({",
        "    order: order.id,",
        "    amount: order.total,",
        "  });",
        "  return notify(order.customer);",
        "};"
      ],
      "highlightLines": [
        8
      ]
    }
  ]
}
```

:::

::::
