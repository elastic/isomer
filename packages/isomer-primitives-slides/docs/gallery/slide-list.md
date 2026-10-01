---
navigation_title: slideList
---

# `slideList`

Give the audience a handful of short facts to scan, each optionally keyed by a short term.

## Use when

- You have up to six one-line facts, such as what changed, what shipped, or what a thing guarantees.
- Each fact belongs to a name, date, or identifier worth setting in its own column.
- The facts need a small caption above or a qualifying note below.

## Avoid when

- The terms are new vocabulary the audience must learn; use slideDefinitions.
- Each item has several attributes to compare; use slideTable.
- The items are files and folders; use slideTree.
- The points are the slide’s main content and want a marker each; use slideBulletList.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideList example 1, light](images/slide-list-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideList example 1, dark](images/slide-list-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**SHIPPED IN 4.2**

- **Search**: Tolerates typos, even in brand names
- **Cart**: Survives a lost connection and syncs later
- **Checkout**: Saves a card with one tap
- **Receipts**: Arrive by email and in the app

Each change shipped behind a flag and reached every customer within a week.
```

:::

:::{tab-item} Text
:sync: text

```text
SHIPPED IN 4.2

Search: Tolerates typos, even in brand names
Cart: Survives a lost connection and syncs later
Checkout: Saves a card with one tap
Receipts: Arrive by email and in the app

Each change shipped behind a flag and reached every customer within a week.
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
        "text": "*SHIPPED IN 4.2*"
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
                "text": "Search",
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
                "text": "Tolerates typos, even in brand names"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Cart",
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
                "text": "Survives a lost connection and syncs later"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Checkout",
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
                "text": "Saves a card with one tap"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Receipts",
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
                "text": "Arrive by email and in the app"
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
        "text": "Each change shipped behind a flag and reached every customer within a week."
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*SHIPPED%20IN%204.2*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Search%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Tolerates%20typos%2C%20even%20in%20brand%20names%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Cart%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Survives%20a%20lost%20connection%20and%20syncs%20later%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Checkout%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Saves%20a%20card%20with%20one%20tap%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Receipts%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Arrive%20by%20email%20and%20in%20the%20app%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Each%20change%20shipped%20behind%20a%20flag%20and%20reached%20every%20customer%20within%20a%20week.%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideList",
  "label": "Shipped in 4.2",
  "items": [
    {
      "term": "Search",
      "body": "Tolerates typos, even in brand names"
    },
    {
      "term": "Cart",
      "body": "Survives a lost connection and syncs later"
    },
    {
      "term": "Checkout",
      "body": "Saves a card with one tap"
    },
    {
      "term": "Receipts",
      "body": "Arrive by email and in the app"
    }
  ],
  "footnote": "Each change shipped behind a flag and reached every customer within a week."
}
```

:::

::::

### Example 2

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideList example 2, light](images/slide-list-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideList example 2, dark](images/slide-list-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- Written once by the pricing team
- Read by checkout, invoices, and the storefront
- Versioned, so an old order keeps its old price
```

:::

:::{tab-item} Text
:sync: text

```text
Written once by the pricing team
Read by checkout, invoices, and the storefront
Versioned, so an old order keeps its old price
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
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Written once by the pricing team"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Read by checkout, invoices, and the storefront"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Versioned, so an old order keeps its old price"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Written%20once%20by%20the%20pricing%20team%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Read%20by%20checkout%2C%20invoices%2C%20and%20the%20storefront%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Versioned%2C%20so%20an%20old%20order%20keeps%20its%20old%20price%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideList",
  "items": [
    {
      "body": "Written once by the pricing team"
    },
    {
      "body": "Read by checkout, invoices, and the storefront"
    },
    {
      "body": "Versioned, so an old order keeps its old price"
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

![slideList example 3, light](images/slide-list-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideList example 3, dark](images/slide-list-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**INCIDENT TIMELINE**

- **09:12**: Error rate on payments passes two percent
- **09:15**: On-call engineer paged and acknowledges
- Twenty minutes spent ruling out the card network
- **09:47**: Bad config rolled back; errors clear
```

:::

:::{tab-item} Text
:sync: text

```text
INCIDENT TIMELINE

09:12: Error rate on payments passes two percent
09:15: On-call engineer paged and acknowledges
Twenty minutes spent ruling out the card network
09:47: Bad config rolled back; errors clear
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
        "text": "*INCIDENT TIMELINE*"
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
                "text": "09:12",
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
                "text": "Error rate on payments passes two percent"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "09:15",
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
                "text": "On-call engineer paged and acknowledges"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Twenty minutes spent ruling out the card network"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "09:47",
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
                "text": "Bad config rolled back; errors clear"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*INCIDENT%20TIMELINE*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2209%3A12%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Error%20rate%20on%20payments%20passes%20two%20percent%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2209%3A15%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22On-call%20engineer%20paged%20and%20acknowledges%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Twenty%20minutes%20spent%20ruling%20out%20the%20card%20network%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2209%3A47%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Bad%20config%20rolled%20back%3B%20errors%20clear%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideList",
  "label": "Incident timeline",
  "items": [
    {
      "term": "09:12",
      "body": "Error rate on payments passes two percent"
    },
    {
      "term": "09:15",
      "body": "On-call engineer paged and acknowledges"
    },
    {
      "body": "Twenty minutes spent ruling out the card network"
    },
    {
      "term": "09:47",
      "body": "Bad config rolled back; errors clear"
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

![slideList example 4, light](images/slide-list-4-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideList example 4, dark](images/slide-list-4-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- Run `migrate` before the first deploy
- Prices are **read-only** after checkout starts
```

:::

:::{tab-item} Text
:sync: text

```text
Run migrate before the first deploy
Prices are read-only after checkout starts
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
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Run "
              },
              {
                "type": "text",
                "text": "migrate",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": " before the first deploy"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Prices are "
              },
              {
                "type": "text",
                "text": "read-only",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " after checkout starts"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Run%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22migrate%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20before%20the%20first%20deploy%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Prices%20are%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22read-only%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20after%20checkout%20starts%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideList",
  "items": [
    {
      "body": "Run `migrate` before the first deploy"
    },
    {
      "body": "Prices are **read-only** after checkout starts"
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

![slideList example 5, light](images/slide-list-5-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideList example 5, dark](images/slide-list-5-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**WHAT THE LEDGER GUARANTEES**

- **Order**: Entries apply in the order they were written
- **Balance**: No account goes below zero, even for a moment
- **History**: Nothing is edited; a correction is a new entry
- **Replay**: Any day can be rebuilt from its entries alone
- **Audit**: Every entry names who wrote it and why
- **Currency**: Amounts carry their currency; none convert

These hold for every service that writes to the ledger, including the batch jobs that settle overnight.
```

:::

:::{tab-item} Text
:sync: text

```text
WHAT THE LEDGER GUARANTEES

Order: Entries apply in the order they were written
Balance: No account goes below zero, even for a moment
History: Nothing is edited; a correction is a new entry
Replay: Any day can be rebuilt from its entries alone
Audit: Every entry names who wrote it and why
Currency: Amounts carry their currency; none convert

These hold for every service that writes to the ledger, including the batch jobs that settle overnight.
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
        "text": "*WHAT THE LEDGER GUARANTEES*"
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
                "text": "Entries apply in the order they were written"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Balance",
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
                "text": "No account goes below zero, even for a moment"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "History",
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
                "text": "Nothing is edited; a correction is a new entry"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Replay",
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
                "text": "Any day can be rebuilt from its entries alone"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Audit",
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
                "text": "Every entry names who wrote it and why"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Currency",
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
                "text": "Amounts carry their currency; none convert"
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
        "text": "These hold for every service that writes to the ledger, including the batch jobs that settle overnight."
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*WHAT%20THE%20LEDGER%20GUARANTEES*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Order%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Entries%20apply%20in%20the%20order%20they%20were%20written%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Balance%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22No%20account%20goes%20below%20zero%2C%20even%20for%20a%20moment%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22History%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Nothing%20is%20edited%3B%20a%20correction%20is%20a%20new%20entry%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Replay%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Any%20day%20can%20be%20rebuilt%20from%20its%20entries%20alone%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Audit%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Every%20entry%20names%20who%20wrote%20it%20and%20why%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Currency%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Amounts%20carry%20their%20currency%3B%20none%20convert%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22These%20hold%20for%20every%20service%20that%20writes%20to%20the%20ledger%2C%20including%20the%20batch%20jobs%20that%20settle%20overnight.%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideList",
  "label": "What the ledger guarantees",
  "items": [
    {
      "term": "Order",
      "body": "Entries apply in the order they were written"
    },
    {
      "term": "Balance",
      "body": "No account goes below zero, even for a moment"
    },
    {
      "term": "History",
      "body": "Nothing is edited; a correction is a new entry"
    },
    {
      "term": "Replay",
      "body": "Any day can be rebuilt from its entries alone"
    },
    {
      "term": "Audit",
      "body": "Every entry names who wrote it and why"
    },
    {
      "term": "Currency",
      "body": "Amounts carry their currency; none convert"
    }
  ],
  "footnote": "These hold for every service that writes to the ledger, including the batch jobs that settle overnight."
}
```

:::

::::
