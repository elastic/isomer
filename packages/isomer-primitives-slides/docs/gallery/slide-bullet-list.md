---
navigation_title: slideBulletList
---

# `slideBulletList`

Give the audience a few short, unordered points, marked as neutral, done, or left out.

## Use when

- You have two to six short points with no names or numbers to key them by.
- You want to show what is in scope and what is not, with `check` and `x` markers.

## Avoid when

- Each point belongs to a term, date, or identifier; use slideList.
- The points are terms the audience must learn; use slideDefinitions.
- The order matters, as steps; use slidePipeline.
- The points split by who owns them; use slideTerritoryGroup.
- The points are source code or commands; use slideCode.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideBulletList example 1, light](images/slide-bullet-list-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideBulletList example 1, dark](images/slide-bullet-list-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- Refunds post to the original card within **two days**.
- Store credit is instant and never expires.
- Returns by mail need no receipt.
```

:::

:::{tab-item} Text
:sync: text

```text
- Refunds post to the original card within two days.
- Store credit is instant and never expires.
- Returns by mail need no receipt.
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
                "text": "Refunds post to the original card within "
              },
              {
                "type": "text",
                "text": "two days",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": "."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Store credit is instant and never expires."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Returns by mail need no receipt."
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Refunds%20post%20to%20the%20original%20card%20within%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22two%20days%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Store%20credit%20is%20instant%20and%20never%20expires.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Returns%20by%20mail%20need%20no%20receipt.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideBulletList",
  "items": [
    "Refunds post to the original card within **two days**.",
    "Store credit is instant and never expires.",
    "Returns by mail need no receipt."
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

![slideBulletList example 2, light](images/slide-bullet-list-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideBulletList example 2, dark](images/slide-bullet-list-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**IN THE SPRING RELEASE**

- ✓ Saved carts across devices.
- ✓ Apple Pay at checkout.
```

:::

:::{tab-item} Text
:sync: text

```text
IN THE SPRING RELEASE
✓ Saved carts across devices.
✓ Apple Pay at checkout.
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
        "text": "*IN THE SPRING RELEASE*"
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
                "text": "Saved carts across devices."
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
                "text": "Apple Pay at checkout."
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*IN%20THE%20SPRING%20RELEASE*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Saved%20carts%20across%20devices.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Apple%20Pay%20at%20checkout.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideBulletList",
  "label": "In the spring release",
  "marker": "check",
  "items": [
    "Saved carts across devices.",
    "Apple Pay at checkout."
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

![slideBulletList example 3, light](images/slide-bullet-list-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideBulletList example 3, dark](images/slide-bullet-list-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**NOT THIS QUARTER**

- × Same-day delivery outside the metro area.
- × Gift wrapping.
```

:::

:::{tab-item} Text
:sync: text

```text
NOT THIS QUARTER
× Same-day delivery outside the metro area.
× Gift wrapping.
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
        "text": "*NOT THIS QUARTER*"
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
                "text": "Same-day delivery outside the metro area."
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
                "text": "Gift wrapping."
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*NOT%20THIS%20QUARTER*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%C3%97%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Same-day%20delivery%20outside%20the%20metro%20area.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%C3%97%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Gift%20wrapping.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideBulletList",
  "label": "Not this quarter",
  "marker": "x",
  "items": [
    "Same-day delivery outside the metro area.",
    "Gift wrapping."
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

![slideBulletList example 4, light](images/slide-bullet-list-4-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideBulletList example 4, dark](images/slide-bullet-list-4-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**CHECKOUT, THIS QUARTER**

- ✓ Saved carts across devices.
- ✓ Apple Pay at checkout.
- ✓ Refunds post within **two days**.
- ✓ One courier for the whole basket.
- ✓ Receipts by email and in the app.
- ✓ Store credit that never expires.
```

:::

:::{tab-item} Text
:sync: text

```text
CHECKOUT, THIS QUARTER
✓ Saved carts across devices.
✓ Apple Pay at checkout.
✓ Refunds post within two days.
✓ One courier for the whole basket.
✓ Receipts by email and in the app.
✓ Store credit that never expires.
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
        "text": "*CHECKOUT, THIS QUARTER*"
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
                "text": "Saved carts across devices."
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
                "text": "Apple Pay at checkout."
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
                "text": "Refunds post within "
              },
              {
                "type": "text",
                "text": "two days",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": "."
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
                "text": "One courier for the whole basket."
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
                "text": "Receipts by email and in the app."
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
                "text": "Store credit that never expires."
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*CHECKOUT%2C%20THIS%20QUARTER*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Saved%20carts%20across%20devices.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Apple%20Pay%20at%20checkout.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Refunds%20post%20within%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22two%20days%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22One%20courier%20for%20the%20whole%20basket.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Receipts%20by%20email%20and%20in%20the%20app.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Store%20credit%20that%20never%20expires.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideBulletList",
  "label": "Checkout, this quarter",
  "marker": "check",
  "items": [
    "Saved carts across devices.",
    "Apple Pay at checkout.",
    "Refunds post within **two days**.",
    "One courier for the whole basket.",
    "Receipts by email and in the app.",
    "Store credit that never expires."
  ]
}
```

:::

::::
