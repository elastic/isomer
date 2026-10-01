---
navigation_title: slideDiff
---

# `slideDiff`

Show the reader exactly what a change did to a piece of source: which lines it added, which it removed, and what stayed.

## Use when

- The point of the slide is a before and after of the same snippet, such as a fix, a refactor, or a config change.
- A few changed lines need their surrounding context to make sense.

## Avoid when

- Nothing changed and you are showing code as it is; use slideCode.
- You are comparing two ideas or approaches rather than two versions of one file; use slideSplit.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideDiff example 1, light](images/slide-diff-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideDiff example 1, dark](images/slide-diff-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
**refund.ts · before and after**

```diff
 export const refund = async (order: Order) => {
-  await fraud.check(order);
   await ledger.write(order.id, -order.total);
+  await fraud.check(order);
   return notify(order.customer);
 };
```
````

:::

:::{tab-item} Text
:sync: text

```text
refund.ts · before and after
 export const refund = async (order: Order) => {
-  await fraud.check(order);
   await ledger.write(order.id, -order.total);
+  await fraud.check(order);
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
      "text": "refund.ts · before and after\n```\n export const refund = async (order: Order) => {\n-  await fraud.check(order);\n   await ledger.write(order.id, -order.total);\n+  await fraud.check(order);\n   return notify(order.customer);\n };\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22refund.ts%20%C2%B7%20before%20and%20after%5Cn%60%60%60%5Cn%20export%20const%20refund%20%3D%20async%20(order%3A%20Order)%20%3D%3E%20%7B%5Cn-%20%20await%20fraud.check(order)%3B%5Cn%20%20%20await%20ledger.write(order.id%2C%20-order.total)%3B%5Cn%2B%20%20await%20fraud.check(order)%3B%5Cn%20%20%20return%20notify(order.customer)%3B%5Cn%20%7D%3B%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideDiff",
  "file": "refund.ts · before and after",
  "language": "ts",
  "lines": [
    {
      "text": "export const refund = async (order: Order) => {"
    },
    {
      "text": "  await fraud.check(order);",
      "op": "remove"
    },
    {
      "text": "  await ledger.write(order.id, -order.total);"
    },
    {
      "text": "  await fraud.check(order);",
      "op": "add"
    },
    {
      "text": "  return notify(order.customer);"
    },
    {
      "text": "};"
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

![slideDiff example 2, light](images/slide-diff-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideDiff example 2, dark](images/slide-diff-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
```diff
 checkout:
-  timeout: 30s
+  timeout: 10s
+  retries: 3
 
   currency: EUR
```
````

:::

:::{tab-item} Text
:sync: text

```text
 checkout:
-  timeout: 30s
+  timeout: 10s
+  retries: 3
 
   currency: EUR
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
      "text": "```\n checkout:\n-  timeout: 30s\n+  timeout: 10s\n+  retries: 3\n \n   currency: EUR\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%60%60%60%5Cn%20checkout%3A%5Cn-%20%20timeout%3A%2030s%5Cn%2B%20%20timeout%3A%2010s%5Cn%2B%20%20retries%3A%203%5Cn%20%5Cn%20%20%20currency%3A%20EUR%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideDiff",
  "language": "yaml",
  "lines": [
    {
      "text": "checkout:"
    },
    {
      "text": "  timeout: 30s",
      "op": "remove"
    },
    {
      "text": "  timeout: 10s",
      "op": "add"
    },
    {
      "text": "  retries: 3",
      "op": "add"
    },
    {
      "text": ""
    },
    {
      "text": "  currency: EUR"
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

![slideDiff example 3, light](images/slide-diff-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideDiff example 3, dark](images/slide-diff-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
**order.json · after the refund**

```diff
 {
   "id": "ord_4821",
   "customer": "cus_190",
-  "status": "paid",
+  "status": "refunded",
   "items": [{ "sku": "OAT-1L", "qty": 2 }],
   "total": 1149,
-  "currency": "EUR"
+  "currency": "EUR",
+  "refund": {
+    "amount": 1149,
+    "settled": "2026-03-02"
+  }
 }
```
````

:::

:::{tab-item} Text
:sync: text

```text
order.json · after the refund
 {
   "id": "ord_4821",
   "customer": "cus_190",
-  "status": "paid",
+  "status": "refunded",
   "items": [{ "sku": "OAT-1L", "qty": 2 }],
   "total": 1149,
-  "currency": "EUR"
+  "currency": "EUR",
+  "refund": {
+    "amount": 1149,
+    "settled": "2026-03-02"
+  }
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
      "text": "order.json · after the refund\n```\n {\n   \"id\": \"ord_4821\",\n   \"customer\": \"cus_190\",\n-  \"status\": \"paid\",\n+  \"status\": \"refunded\",\n   \"items\": [{ \"sku\": \"OAT-1L\", \"qty\": 2 }],\n   \"total\": 1149,\n-  \"currency\": \"EUR\"\n+  \"currency\": \"EUR\",\n+  \"refund\": {\n+    \"amount\": 1149,\n+    \"settled\": \"2026-03-02\"\n+  }\n }\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22order.json%20%C2%B7%20after%20the%20refund%5Cn%60%60%60%5Cn%20%7B%5Cn%20%20%20%5C%22id%5C%22%3A%20%5C%22ord_4821%5C%22%2C%5Cn%20%20%20%5C%22customer%5C%22%3A%20%5C%22cus_190%5C%22%2C%5Cn-%20%20%5C%22status%5C%22%3A%20%5C%22paid%5C%22%2C%5Cn%2B%20%20%5C%22status%5C%22%3A%20%5C%22refunded%5C%22%2C%5Cn%20%20%20%5C%22items%5C%22%3A%20%5B%7B%20%5C%22sku%5C%22%3A%20%5C%22OAT-1L%5C%22%2C%20%5C%22qty%5C%22%3A%202%20%7D%5D%2C%5Cn%20%20%20%5C%22total%5C%22%3A%201149%2C%5Cn-%20%20%5C%22currency%5C%22%3A%20%5C%22EUR%5C%22%5Cn%2B%20%20%5C%22currency%5C%22%3A%20%5C%22EUR%5C%22%2C%5Cn%2B%20%20%5C%22refund%5C%22%3A%20%7B%5Cn%2B%20%20%20%20%5C%22amount%5C%22%3A%201149%2C%5Cn%2B%20%20%20%20%5C%22settled%5C%22%3A%20%5C%222026-03-02%5C%22%5Cn%2B%20%20%7D%5Cn%20%7D%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideDiff",
  "file": "order.json · after the refund",
  "language": "json",
  "lines": [
    {
      "text": "{"
    },
    {
      "text": "  \"id\": \"ord_4821\","
    },
    {
      "text": "  \"customer\": \"cus_190\","
    },
    {
      "text": "  \"status\": \"paid\",",
      "op": "remove"
    },
    {
      "text": "  \"status\": \"refunded\",",
      "op": "add"
    },
    {
      "text": "  \"items\": [{ \"sku\": \"OAT-1L\", \"qty\": 2 }],"
    },
    {
      "text": "  \"total\": 1149,"
    },
    {
      "text": "  \"currency\": \"EUR\"",
      "op": "remove"
    },
    {
      "text": "  \"currency\": \"EUR\",",
      "op": "add"
    },
    {
      "text": "  \"refund\": {",
      "op": "add"
    },
    {
      "text": "    \"amount\": 1149,",
      "op": "add"
    },
    {
      "text": "    \"settled\": \"2026-03-02\"",
      "op": "add"
    },
    {
      "text": "  }",
      "op": "add"
    },
    {
      "text": "}"
    }
  ]
}
```

:::

::::
