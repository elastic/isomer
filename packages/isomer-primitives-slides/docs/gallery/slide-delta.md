---
navigation_title: slideDelta
---

# `slideDelta`

Show how far one number moved between two points, and what that change means.

## Use when

- The slide’s point is an improvement or a regression: one measure, before and after.
- The size of the change matters as much as either number; state it in `change`.

## Avoid when

- The numbers measure different things rather than one thing twice; use slideStats.
- More than two points in time matter; use slideBars for the amounts.
- There is one number and no before; use slideStat.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideDelta example 1, light](images/slide-delta-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideDelta example 1, dark](images/slide-delta-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**OLD CHECKOUT** 4.2s → **NEW CHECKOUT** 1.1s. **−74%**: Median time from **Pay** to the confirmation page, measured over the same two weeks of traffic.
```

:::

:::{tab-item} Text
:sync: text

```text
OLD CHECKOUT 4.2s → NEW CHECKOUT 1.1s. −74%: Median time from Pay to the confirmation page, measured over the same two weeks of traffic.
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
            "text": "OLD CHECKOUT",
            "style": {
              "bold": true
            }
          },
          {
            "type": "text",
            "text": " "
          },
          {
            "type": "text",
            "text": "4.2s"
          },
          {
            "type": "text",
            "text": " → "
          },
          {
            "type": "text",
            "text": "NEW CHECKOUT",
            "style": {
              "bold": true
            }
          },
          {
            "type": "text",
            "text": " "
          },
          {
            "type": "text",
            "text": "1.1s"
          },
          {
            "type": "text",
            "text": ". "
          },
          {
            "type": "text",
            "text": "−74%",
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
            "text": "Median time from "
          },
          {
            "type": "text",
            "text": "Pay",
            "style": {
              "bold": true
            }
          },
          {
            "type": "text",
            "text": " to the confirmation page, measured over the same two weeks of traffic."
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22OLD%20CHECKOUT%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%224.2s%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%86%92%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22NEW%20CHECKOUT%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%221.1s%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22.%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%88%9274%25%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Median%20time%20from%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Pay%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20to%20the%20confirmation%20page%2C%20measured%20over%20the%20same%20two%20weeks%20of%20traffic.%22%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideDelta",
  "before": {
    "label": "Old checkout",
    "value": "4.2s"
  },
  "after": {
    "label": "New checkout",
    "value": "1.1s"
  },
  "change": "−74%",
  "body": "Median time from **Pay** to the confirmation page, measured over the same two weeks of traffic."
}
```

:::

::::

### Example 2

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideDelta example 2, light](images/slide-delta-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideDelta example 2, dark](images/slide-delta-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**JANUARY** 12,480 → **JUNE** 31,905. **+156%**: Monthly active drivers after the referral bonus launched in March.
```

:::

:::{tab-item} Text
:sync: text

```text
JANUARY 12,480 → JUNE 31,905. +156%: Monthly active drivers after the referral bonus launched in March.
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
            "text": "JANUARY",
            "style": {
              "bold": true
            }
          },
          {
            "type": "text",
            "text": " "
          },
          {
            "type": "text",
            "text": "12,480"
          },
          {
            "type": "text",
            "text": " → "
          },
          {
            "type": "text",
            "text": "JUNE",
            "style": {
              "bold": true
            }
          },
          {
            "type": "text",
            "text": " "
          },
          {
            "type": "text",
            "text": "31,905"
          },
          {
            "type": "text",
            "text": ". "
          },
          {
            "type": "text",
            "text": "+156%",
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
            "text": "Monthly active drivers after the referral bonus launched in March."
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22JANUARY%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%2212%2C480%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%86%92%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22JUNE%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%2231%2C905%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22.%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%2B156%25%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Monthly%20active%20drivers%20after%20the%20referral%20bonus%20launched%20in%20March.%22%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideDelta",
  "before": {
    "label": "January",
    "value": "12,480"
  },
  "after": {
    "label": "June",
    "value": "31,905"
  },
  "change": "+156%",
  "body": "Monthly active drivers after the referral bonus launched in March."
}
```

:::

::::

### Example 3

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideDelta example 3, light](images/slide-delta-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideDelta example 3, dark](images/slide-delta-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**BEFORE THE MOVE** 38 → **AFTER THE MOVE** _value pending_. Support tickets per thousand orders; the first full month on the new warehouse closes on the 30th.
```

:::

:::{tab-item} Text
:sync: text

```text
BEFORE THE MOVE 38 → AFTER THE MOVE [value pending]. Support tickets per thousand orders; the first full month on the new warehouse closes on the 30th.
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
            "text": "BEFORE THE MOVE",
            "style": {
              "bold": true
            }
          },
          {
            "type": "text",
            "text": " "
          },
          {
            "type": "text",
            "text": "38"
          },
          {
            "type": "text",
            "text": " → "
          },
          {
            "type": "text",
            "text": "AFTER THE MOVE",
            "style": {
              "bold": true
            }
          },
          {
            "type": "text",
            "text": " "
          },
          {
            "type": "text",
            "text": "value pending",
            "style": {
              "italic": true
            }
          },
          {
            "type": "text",
            "text": ". "
          },
          {
            "type": "text",
            "text": "Support tickets per thousand orders; the first full month on the new warehouse closes on the 30th."
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22BEFORE%20THE%20MOVE%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%2238%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%86%92%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22AFTER%20THE%20MOVE%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22value%20pending%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22.%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Support%20tickets%20per%20thousand%20orders%3B%20the%20first%20full%20month%20on%20the%20new%20warehouse%20closes%20on%20the%2030th.%22%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideDelta",
  "before": {
    "label": "Before the move",
    "value": "38"
  },
  "after": {
    "label": "After the move"
  },
  "body": "Support tickets per thousand orders; the first full month on the new warehouse closes on the 30th."
}
```

:::

::::
