---
navigation_title: slideGraph
---

# `slideGraph`

Define a small vocabulary and show how its terms relate, so the audience can hold the whole model at once.

## Use when

- You are introducing 2–6 named concepts, each with a one-line definition, and the arrows between them matter.
- The concepts form a chain with at most one concept feeding in from above and one from below.

## Avoid when

- One source feeds many targets; use slideFanout.
- The terms have no arrows between them; use slideDefinitions.
- The points are dated events in order; use slideTimeline.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideGraph example 1, light](images/slide-graph-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideGraph example 1, dark](images/slide-graph-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
A basket becomes an order once **pricing and stock** agree.

- **Catalog**: Every product a store can sell.
- **Basket**: What a customer means to buy.
- ● **Order**: A priced basket with a slot.
- **Delivery**: One van run, many orders.
- **Pricing**: Offers, fixed at checkout.
- **Stock**: What the store holds now.

Catalog → Basket, Basket → Order, Order → Delivery, Pricing → Order, Stock → Order
```

:::

:::{tab-item} Text
:sync: text

```text
A basket becomes an order once pricing and stock agree.

Catalog: Every product a store can sell.
Basket: What a customer means to buy.
● Order: A priced basket with a slot.
Delivery: One van run, many orders.
Pricing: Offers, fixed at checkout.
Stock: What the store holds now.

Catalog → Basket, Basket → Order, Order → Delivery, Pricing → Order, Stock → Order
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_section",
        "elements": [
          {
            "type": "text",
            "text": "A basket becomes an order once "
          },
          {
            "type": "text",
            "text": "pricing and stock",
            "style": {
              "bold": true
            }
          },
          {
            "type": "text",
            "text": " agree."
          }
        ]
      },
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Catalog",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Every product a store can sell."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Basket",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "What a customer means to buy."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "● "
              },
              {
                "type": "text",
                "text": "Order",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "A priced basket with a slot."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Delivery",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "One van run, many orders."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Pricing",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Offers, fixed at checkout."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Stock",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "What the store holds now."
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
        "text": "Catalog → Basket, Basket → Order, Order → Delivery, Pricing → Order, Stock → Order"
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22A%20basket%20becomes%20an%20order%20once%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22pricing%20and%20stock%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20agree.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Catalog%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Every%20product%20a%20store%20can%20sell.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Basket%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22What%20a%20customer%20means%20to%20buy.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Order%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22A%20priced%20basket%20with%20a%20slot.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Delivery%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22One%20van%20run%2C%20many%20orders.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Pricing%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Offers%2C%20fixed%20at%20checkout.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Stock%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22What%20the%20store%20holds%20now.%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Catalog%20%E2%86%92%20Basket%2C%20Basket%20%E2%86%92%20Order%2C%20Order%20%E2%86%92%20Delivery%2C%20Pricing%20%E2%86%92%20Order%2C%20Stock%20%E2%86%92%20Order%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideGraph",
  "caption": "A basket becomes an order once **pricing and stock** agree.",
  "nodes": [
    {
      "id": "catalog",
      "term": "Catalog",
      "body": "Every product a store can sell."
    },
    {
      "id": "basket",
      "term": "Basket",
      "body": "What a customer means to buy."
    },
    {
      "id": "order",
      "term": "Order",
      "body": "A priced basket with a slot.",
      "emphasis": true
    },
    {
      "id": "delivery",
      "term": "Delivery",
      "body": "One van run, many orders."
    },
    {
      "id": "pricing",
      "term": "Pricing",
      "body": "Offers, fixed at checkout.",
      "placement": "above"
    },
    {
      "id": "stock",
      "term": "Stock",
      "body": "What the store holds now.",
      "placement": "below"
    }
  ],
  "edges": [
    [
      "catalog",
      "basket"
    ],
    [
      "basket",
      "order"
    ],
    [
      "order",
      "delivery"
    ],
    [
      "pricing",
      "order"
    ],
    [
      "stock",
      "order"
    ]
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

![slideGraph example 2, light](images/slide-graph-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideGraph example 2, dark](images/slide-graph-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
Every incident ends in a review, whatever its size.

- **Incident**: Something customers noticed, with a start and an end.
- ● **Review**: A blameless write-up with owners for each `follow-up`.

Incident → Review
```

:::

:::{tab-item} Text
:sync: text

```text
Every incident ends in a review, whatever its size.

Incident: Something customers noticed, with a start and an end.
● Review: A blameless write-up with owners for each follow-up.

Incident → Review
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_section",
        "elements": [
          {
            "type": "text",
            "text": "Every incident ends in a review, whatever its size."
          }
        ]
      },
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Incident",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Something customers noticed, with a start and an end."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "● "
              },
              {
                "type": "text",
                "text": "Review",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "A blameless write-up with owners for each "
              },
              {
                "type": "text",
                "text": "follow-up",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": "."
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
        "text": "Incident → Review"
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Every%20incident%20ends%20in%20a%20review%2C%20whatever%20its%20size.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Incident%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Something%20customers%20noticed%2C%20with%20a%20start%20and%20an%20end.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Review%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22A%20blameless%20write-up%20with%20owners%20for%20each%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22follow-up%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22.%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Incident%20%E2%86%92%20Review%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideGraph",
  "caption": "Every incident ends in a review, whatever its size.",
  "nodes": [
    {
      "id": "incident",
      "term": "Incident",
      "body": "Something customers noticed, with a start and an end."
    },
    {
      "id": "review",
      "term": "Review",
      "body": "A blameless write-up with owners for each `follow-up`.",
      "emphasis": true
    }
  ],
  "edges": [
    [
      "incident",
      "review"
    ]
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

![slideGraph example 3, light](images/slide-graph-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideGraph example 3, dark](images/slide-graph-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
A release ships a build; the changelog is written from it.

- **Commit**: One reviewed change on the main branch.
- **Build**: An immutable artifact made from one commit.
- ● **Release**: A build promoted to customers.
- **Policy**: Checks every commit must pass before it lands.
- **Changelog**: The customer-facing notes for a release.

Commit → Build, Build → Release, Policy → Commit, Release → Changelog
```

:::

:::{tab-item} Text
:sync: text

```text
A release ships a build; the changelog is written from it.

Commit: One reviewed change on the main branch.
Build: An immutable artifact made from one commit.
● Release: A build promoted to customers.
Policy: Checks every commit must pass before it lands.
Changelog: The customer-facing notes for a release.

Commit → Build, Build → Release, Policy → Commit, Release → Changelog
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_section",
        "elements": [
          {
            "type": "text",
            "text": "A release ships a build; the changelog is written from it."
          }
        ]
      },
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Commit",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "One reviewed change on the main branch."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Build",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "An immutable artifact made from one commit."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "● "
              },
              {
                "type": "text",
                "text": "Release",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "A build promoted to customers."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Policy",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Checks every commit must pass before it lands."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Changelog",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "The customer-facing notes for a release."
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
        "text": "Commit → Build, Build → Release, Policy → Commit, Release → Changelog"
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22A%20release%20ships%20a%20build%3B%20the%20changelog%20is%20written%20from%20it.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Commit%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22One%20reviewed%20change%20on%20the%20main%20branch.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Build%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22An%20immutable%20artifact%20made%20from%20one%20commit.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Release%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22A%20build%20promoted%20to%20customers.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Policy%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Checks%20every%20commit%20must%20pass%20before%20it%20lands.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Changelog%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20customer-facing%20notes%20for%20a%20release.%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Commit%20%E2%86%92%20Build%2C%20Build%20%E2%86%92%20Release%2C%20Policy%20%E2%86%92%20Commit%2C%20Release%20%E2%86%92%20Changelog%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideGraph",
  "caption": "A release ships a build; the changelog is written from it.",
  "nodes": [
    {
      "id": "commit",
      "term": "Commit",
      "body": "One reviewed change on the main branch."
    },
    {
      "id": "build",
      "term": "Build",
      "body": "An immutable artifact made from one commit."
    },
    {
      "id": "release",
      "term": "Release",
      "body": "A build promoted to customers.",
      "emphasis": true
    },
    {
      "id": "policy",
      "term": "Policy",
      "body": "Checks every commit must pass before it lands.",
      "placement": "above"
    },
    {
      "id": "changelog",
      "term": "Changelog",
      "body": "The customer-facing notes for a release.",
      "placement": "below"
    }
  ],
  "edges": [
    [
      "commit",
      "build"
    ],
    [
      "build",
      "release"
    ],
    [
      "policy",
      "commit"
    ],
    [
      "release",
      "changelog"
    ]
  ]
}
```

:::

::::
