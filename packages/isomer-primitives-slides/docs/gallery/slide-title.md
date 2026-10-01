---
navigation_title: slideTitle
---

# `slideTitle`

Introduce the deck’s subject by name, with its promise and, optionally, a diagram of what it does.

## Use when

- Opening a deck; it is the only node in an inverse frame.
- The subject has a short name worth setting very large.

## Avoid when

- The slide makes a claim mid-deck; use slideHeading in a page frame.
- A section is starting; use slideSection.
- The deck is ending; use slideClosing.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideTitle example 1, light](images/slide-title-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTitle example 1, dark](images/slide-title-1-dark.png)

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
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%22Crate%22%2C%22emoji%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*A%20grocery%20delivery%20platform*%22%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22One%20order.%20Every%20store.%22%7D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22_crate%20n._%20Everything%20a%20customer%20means%20to%20buy%2C%20carried%20from%20whichever%20store%20can%20fill%20it.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Splits%20one%20order%20across%20nearby%20stores.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Books%20one%20courier%20for%20the%20whole%20basket.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Charges%20the%20card%20once.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
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
```

:::

::::

### Example 2

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideTitle example 2, light](images/slide-title-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTitle example 2, dark](images/slide-title-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# Payments

_Quarterly review_

Faster refunds, **fewer disputes**.
```

:::

:::{tab-item} Text
:sync: text

```text
QUARTERLY REVIEW
Payments
Faster refunds, fewer disputes.
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
      "text": "Payments",
      "emoji": true
    }
  },
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "*Quarterly review*"
      }
    ]
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "Faster refunds, *fewer disputes*."
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%22Payments%22%2C%22emoji%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Quarterly%20review*%22%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Faster%20refunds%2C%20*fewer%20disputes*.%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTitle",
  "eyebrow": "Quarterly review",
  "title": "Payments",
  "tagline": "Faster refunds, **fewer disputes**."
}
```

:::

::::

### Example 3

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideTitle example 3, light](images/slide-title-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTitle example 3, dark](images/slide-title-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# Onboarding
```

:::

:::{tab-item} Text
:sync: text

```text
Onboarding
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
      "text": "Onboarding",
      "emoji": true
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%22Onboarding%22%2C%22emoji%22%3Atrue%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTitle",
  "title": "Onboarding"
}
```

:::

::::
