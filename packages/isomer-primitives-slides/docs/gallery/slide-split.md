---
navigation_title: slideSplit
---

# `slideSplit`

Set two things side by side so the reader compares them: two owners, a before and after, or an input and what it becomes.

## Use when

- You are dividing responsibilities between two parties; put a slideBulletList under each label with a `rule` divider.
- One thing turns into another, like a config into behavior; use the `arrow` divider.
- Two slide nodes belong next to each other, or a main idea with a narrow column of notes beside it; for notes, use the `aside` ratio with the `hairline` divider and a label over the notes.

## Avoid when

- The nodes belong one above the other; list them in the slideFrame body.
- You are mapping who owns which areas across several teams; use slideTerritoryGroup.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideSplit example 1, light](images/slide-split-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideSplit example 1, dark](images/slide-split-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
## ● Payments team

- Card capture
- Fraud scoring
- Settlement
- Refunds

## ○ Merchant

- Prices
- Stock
- Shipping
- Customer support

Because the line is fixed, a merchant can change prices **without a payments release**.
```

:::

:::{tab-item} Text
:sync: text

```text
● PAYMENTS TEAM
- Card capture
- Fraud scoring
- Settlement
- Refunds

○ MERCHANT
- Prices
- Stock
- Shipping
- Customer support

Because the line is fixed, a merchant can change prices without a payments release.
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "*● PAYMENTS TEAM*"
      }
    ]
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Card capture"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Fraud scoring"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Settlement"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Refunds"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "*○ MERCHANT*"
      }
    ]
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Prices"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Stock"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Shipping"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Customer support"
              }
            ]
          }
        ]
      }
    ]
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
      "text": "Because the line is fixed, a merchant can change prices *without a payments release*."
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*%E2%97%8F%20PAYMENTS%20TEAM*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Card%20capture%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Fraud%20scoring%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Settlement%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Refunds%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*%E2%97%8B%20MERCHANT*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Prices%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Stock%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Shipping%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Customer%20support%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Because%20the%20line%20is%20fixed%2C%20a%20merchant%20can%20change%20prices%20*without%20a%20payments%20release*.%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideSplit",
  "divider": "rule",
  "panes": [
    {
      "label": "Payments team",
      "tone": "primary",
      "items": [
        {
          "type": "slideBulletList",
          "items": [
            "Card capture",
            "Fraud scoring",
            "Settlement",
            "Refunds"
          ]
        }
      ]
    },
    {
      "label": "Merchant",
      "tone": "accent",
      "items": [
        {
          "type": "slideBulletList",
          "items": [
            "Prices",
            "Stock",
            "Shipping",
            "Customer support"
          ]
        }
      ]
    }
  ],
  "footnote": "Because the line is fixed, a merchant can change prices **without a payments release**."
}
```

:::

::::

### Example 2

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideSplit example 2, light](images/slide-split-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideSplit example 2, dark](images/slide-split-2-dark.png)

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

→

## ● After the change

- ✓ The ledger is written first.
- ✓ Refunds settle in two days.
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

→

● AFTER THE CHANGE
✓ The ledger is written first.
✓ Refunds settle in two days.
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
  },
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "→"
      }
    ]
  },
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "*● AFTER THE CHANGE*"
      }
    ]
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "✓ "
              },
              {
                "type": "text",
                "text": "The ledger is written first."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "✓ "
              },
              {
                "type": "text",
                "text": "Refunds settle in two days."
              }
            ]
          }
        ]
      }
    ]
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22refund.ts%5Cn%60%60%60%5Cnexport%20const%20refund%20%3D%20async%20(order%3A%20Order)%20%3D%3E%20%7B%5Cn%20%20await%20ledger.write(order.id%2C%20-order.total)%3B%5Cn%20%20await%20fraud.check(order)%3B%5Cn%20%20return%20notify(order.customer)%3B%5Cn%7D%3B%5Cn%60%60%60%22%7D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%E2%86%92%22%7D%5D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*%E2%97%8F%20AFTER%20THE%20CHANGE*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20ledger%20is%20written%20first.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Refunds%20settle%20in%20two%20days.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideSplit",
  "ratio": "wideLeft",
  "divider": "arrow",
  "panes": [
    {
      "items": [
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
      ]
    },
    {
      "label": "After the change",
      "tone": "primary",
      "items": [
        {
          "type": "slideBulletList",
          "marker": "check",
          "items": [
            "The ledger is written first.",
            "Refunds settle in two days."
          ]
        }
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

![slideSplit example 3, light](images/slide-split-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideSplit example 3, dark](images/slide-split-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
## Before

- × Five batch windows.
- × Manual retries.

## ● After

- One nightly run.

```
npm run settle -- --nightly
```
````

:::

:::{tab-item} Text
:sync: text

```text
BEFORE
× Five batch windows.
× Manual retries.

● AFTER
- One nightly run.

npm run settle -- --nightly
```

:::

:::{tab-item} Slack
:sync: slack

````json
[
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "*BEFORE*"
      }
    ]
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "× "
              },
              {
                "type": "text",
                "text": "Five batch windows."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "× "
              },
              {
                "type": "text",
                "text": "Manual retries."
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "*● AFTER*"
      }
    ]
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "One nightly run."
              }
            ]
          }
        ]
      }
    ]
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
      "text": "```\nnpm run settle -- --nightly\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*BEFORE*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%C3%97%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Five%20batch%20windows.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%C3%97%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Manual%20retries.%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*%E2%97%8F%20AFTER*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22One%20nightly%20run.%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%60%60%60%5Cnnpm%20run%20settle%20--%20--nightly%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideSplit",
  "ratio": "narrowLeft",
  "panes": [
    {
      "label": "Before",
      "items": [
        {
          "type": "slideBulletList",
          "marker": "x",
          "items": [
            "Five batch windows.",
            "Manual retries."
          ]
        }
      ]
    },
    {
      "label": "After",
      "tone": "primary",
      "items": [
        {
          "type": "slideBulletList",
          "items": [
            "One nightly run."
          ]
        },
        {
          "type": "slideCode",
          "panels": [
            {
              "lines": [
                "npm run settle -- --nightly"
              ]
            }
          ]
        }
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

![slideSplit example 4, light](images/slide-split-4-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideSplit example 4, dark](images/slide-split-4-dark.png)

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

## Why this order

- The ledger records it before anything can fail.
- Fraud can reverse a refund, never lose one.
- Customers hear only about moved money.
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

WHY THIS ORDER
- The ledger records it before anything can fail.
- Fraud can reverse a refund, never lose one.
- Customers hear only about moved money.
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
  },
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "*WHY THIS ORDER*"
      }
    ]
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "The ledger records it before anything can fail."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Fraud can reverse a refund, never lose one."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Customers hear only about moved money."
              }
            ]
          }
        ]
      }
    ]
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22refund.ts%5Cn%60%60%60%5Cnexport%20const%20refund%20%3D%20async%20(order%3A%20Order)%20%3D%3E%20%7B%5Cn%20%20await%20ledger.write(order.id%2C%20-order.total)%3B%5Cn%20%20await%20fraud.check(order)%3B%5Cn%20%20return%20notify(order.customer)%3B%5Cn%7D%3B%5Cn%60%60%60%22%7D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*WHY%20THIS%20ORDER*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20ledger%20records%20it%20before%20anything%20can%20fail.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Fraud%20can%20reverse%20a%20refund%2C%20never%20lose%20one.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Customers%20hear%20only%20about%20moved%20money.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideSplit",
  "ratio": "aside",
  "divider": "hairline",
  "panes": [
    {
      "items": [
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
      ]
    },
    {
      "label": "Why this order",
      "items": [
        {
          "type": "slideBulletList",
          "items": [
            "The ledger records it before anything can fail.",
            "Fraud can reverse a refund, never lose one.",
            "Customers hear only about moved money."
          ]
        }
      ]
    }
  ]
}
```

:::

::::
