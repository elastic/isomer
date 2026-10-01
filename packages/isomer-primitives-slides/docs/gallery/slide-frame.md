---
navigation_title: slideFrame
---

# `slideFrame`

Hold one 16:9 slide: its content top to bottom and a footer naming the deck, the section, and its address.

## Use when

- Every slide; each composition in a deck is exactly one slideFrame and nothing else.
- A title, section, or closing slide needs the dark background; set `tone` to `inverse`.
- Slides belong to numbered sections; set `sectionNumber` and `section` to the section so the footer tracks it.

## Avoid when

- Content inside a slide needs grouping; frames never nest, so use slideSplit or slideStack.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideFrame example 1, light](images/slide-frame-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideFrame example 1, dark](images/slide-frame-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# Refunds settle in two days, not five

Moving the ledger write ahead of the fraud check removed three batch windows.

_Ledger · 02 Settlement · [example.com/ledger](https://example.com/ledger)_
```

:::

:::{tab-item} Text
:sync: text

```text
REFUNDS SETTLE IN TWO DAYS, NOT FIVE
Moving the ledger write ahead of the fraud check removed three batch windows.

Ledger · 02 Settlement · example.com/ledger
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
      "text": "Refunds settle in two days, not five",
      "emoji": true
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "Moving the ledger write ahead of the fraud check removed three batch windows."
    }
  },
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "Ledger · 02 Settlement · example.com/ledger"
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%22Refunds%20settle%20in%20two%20days%2C%20not%20five%22%2C%22emoji%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Moving%20the%20ledger%20write%20ahead%20of%20the%20fraud%20check%20removed%20three%20batch%20windows.%22%7D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Ledger%20%C2%B7%2002%20Settlement%20%C2%B7%20example.com%2Fledger%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideFrame",
  "brand": "Ledger",
  "section": "Settlement",
  "sectionNumber": "02",
  "url": "https://example.com/ledger",
  "body": [
    {
      "type": "slideHeading",
      "title": "Refunds settle in two days, not five",
      "lede": "Moving the ledger write ahead of the fraud check removed three batch windows."
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

![slideFrame example 2, light](images/slide-frame-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideFrame example 2, dark](images/slide-frame-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# Crate

_A grocery delivery platform_

One order. Every store.

_crate n._ Everything a customer means to buy, carried from whichever store can fill it.

- ✓ Splits one order across nearby stores.
- ✓ Books one courier for the whole basket.
- ✓ Charges the card once.

_Ledger_
```

:::

:::{tab-item} Text
:sync: text

```text
A GROCERY DELIVERY PLATFORM
Crate
One order. Every store.
crate n. Everything a customer means to buy, carried from whichever store can fill it.

✓ Splits one order across nearby stores.
✓ Books one courier for the whole basket.
✓ Charges the card once.

Ledger
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
      "text": "Crate",
      "emoji": true
    }
  },
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "*A grocery delivery platform*"
      }
    ]
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "One order. Every store."
    }
  },
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "_crate n._ Everything a customer means to buy, carried from whichever store can fill it."
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
                "text": "Splits one order across nearby stores."
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
                "text": "Books one courier for the whole basket."
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
                "text": "Charges the card once."
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
        "text": "Ledger"
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%22Crate%22%2C%22emoji%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*A%20grocery%20delivery%20platform*%22%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22One%20order.%20Every%20store.%22%7D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22_crate%20n._%20Everything%20a%20customer%20means%20to%20buy%2C%20carried%20from%20whichever%20store%20can%20fill%20it.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Splits%20one%20order%20across%20nearby%20stores.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Books%20one%20courier%20for%20the%20whole%20basket.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Charges%20the%20card%20once.%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Ledger%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideFrame",
  "tone": "inverse",
  "brand": "Ledger",
  "body": [
    {
      "type": "slideTitle",
      "eyebrow": "A grocery delivery platform",
      "title": "Crate",
      "tagline": "One order. Every store.",
      "definition": {
        "term": "crate n.",
        "text": "Everything a customer means to buy, carried from whichever store can fill it."
      },
      "aside": {
        "type": "slideBulletList",
        "marker": "check",
        "items": [
          "Splits one order across nearby stores.",
          "Books one courier for the whole basket.",
          "Charges the card once."
        ]
      }
    }
  ]
}
```

:::

::::
