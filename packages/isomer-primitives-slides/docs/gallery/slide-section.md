---
navigation_title: slideSection
---

# `slideSection`

Tell the audience a new part of the deck is starting, and what it will cover.

## Use when

- Opening a section of a long deck; it is the only node in an inverse frame.
- The audience should see the slides ahead as a short list before they start.

## Avoid when

- The slide makes a claim of its own; use slideHeading in a page frame.
- The slide opens the whole deck; use slideTitle.
- The slide ends the deck; use slideClosing.
- The audience should see where this part sits among every section of the talk; use slideAgenda.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideSection example 1, light](images/slide-section-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideSection example 1, dark](images/slide-section-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# 02 · Settlement

1. Refunds settle in two days, not five
2. The ledger writes before the fraud check
3. Three batch windows are gone
```

:::

:::{tab-item} Text
:sync: text

```text
02 · SETTLEMENT
1. Refunds settle in two days, not five
2. The ledger writes before the fraud check
3. Three batch windows are gone
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "header",
    "text": {
      "type": "plain_text",
      "text": "02 · Settlement",
      "emoji": true
    }
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_list",
        "style": "ordered",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Refunds settle in two days, not five"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "The ledger writes before the fraud check"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Three batch windows are gone"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%2202%20%C2%B7%20Settlement%22%2C%22emoji%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22ordered%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Refunds%20settle%20in%20two%20days%2C%20not%20five%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20ledger%20writes%20before%20the%20fraud%20check%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Three%20batch%20windows%20are%20gone%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideSection",
  "number": "02",
  "title": "Settlement",
  "contents": [
    "Refunds settle in two days, not five",
    "The ledger writes before the fraud check",
    "Three batch windows are gone"
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

![slideSection example 2, light](images/slide-section-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideSection example 2, dark](images/slide-section-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# 04 · The incident

1. [Checkout failed for 41 minutes](#slide-12)
2. [A certificate expired on **one** gateway](#slide-13)
3. [Alerts fired, but to the wrong rotation](#slide-14)
4. [Recovery took one config change](#slide-15)
5. [What we changed afterwards](#slide-16)
```

:::

:::{tab-item} Text
:sync: text

```text
04 · THE INCIDENT
1. Checkout failed for 41 minutes
2. A certificate expired on one gateway
3. Alerts fired, but to the wrong rotation
4. Recovery took one config change
5. What we changed afterwards
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "header",
    "text": {
      "type": "plain_text",
      "text": "04 · The incident",
      "emoji": true
    }
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_list",
        "style": "ordered",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Checkout failed for 41 minutes"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "A certificate expired on "
              },
              {
                "type": "text",
                "text": "one",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " gateway"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Alerts fired, but to the wrong rotation"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Recovery took one config change"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "What we changed afterwards"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%2204%20%C2%B7%20The%20incident%22%2C%22emoji%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22ordered%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Checkout%20failed%20for%2041%20minutes%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22A%20certificate%20expired%20on%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22one%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20gateway%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Alerts%20fired%2C%20but%20to%20the%20wrong%20rotation%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Recovery%20took%20one%20config%20change%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22What%20we%20changed%20afterwards%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideSection",
  "number": "04",
  "title": "The incident",
  "contents": [
    "Checkout failed for 41 minutes",
    "A certificate expired on **one** gateway",
    "Alerts fired, but to the wrong rotation",
    "Recovery took one config change",
    "What we changed afterwards"
  ],
  "hrefs": [
    "#slide-12",
    "#slide-13",
    "#slide-14",
    "#slide-15",
    "#slide-16"
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

![slideSection example 3, light](images/slide-section-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideSection example 3, dark](images/slide-section-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# 03 · The release train

1. Branches cut every Tuesday
2. Staging soaks for two days
3. Feature flags gate every change
4. Canaries take five percent of traffic
5. Rollback is one command
6. Release notes write themselves
7. Hotfixes skip the train
8. Nobody deploys on Friday
```

:::

:::{tab-item} Text
:sync: text

```text
03 · THE RELEASE TRAIN
1. Branches cut every Tuesday
2. Staging soaks for two days
3. Feature flags gate every change
4. Canaries take five percent of traffic
5. Rollback is one command
6. Release notes write themselves
7. Hotfixes skip the train
8. Nobody deploys on Friday
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "header",
    "text": {
      "type": "plain_text",
      "text": "03 · The release train",
      "emoji": true
    }
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_list",
        "style": "ordered",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Branches cut every Tuesday"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Staging soaks for two days"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Feature flags gate every change"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Canaries take five percent of traffic"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Rollback is one command"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Release notes write themselves"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Hotfixes skip the train"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Nobody deploys on Friday"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%2203%20%C2%B7%20The%20release%20train%22%2C%22emoji%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22ordered%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Branches%20cut%20every%20Tuesday%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Staging%20soaks%20for%20two%20days%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Feature%20flags%20gate%20every%20change%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Canaries%20take%20five%20percent%20of%20traffic%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Rollback%20is%20one%20command%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Release%20notes%20write%20themselves%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Hotfixes%20skip%20the%20train%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Nobody%20deploys%20on%20Friday%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideSection",
  "number": "03",
  "title": "The release train",
  "contents": [
    "Branches cut every Tuesday",
    "Staging soaks for two days",
    "Feature flags gate every change",
    "Canaries take five percent of traffic",
    "Rollback is one command",
    "Release notes write themselves",
    "Hotfixes skip the train",
    "Nobody deploys on Friday"
  ]
}
```

:::

::::
