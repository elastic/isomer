---
navigation_title: slideStat
---

# `slideStat`

Land one number that proves the slide, with the sentence that says what it means.

## Use when

- A slide makes its case with a diagram or list, and one measured number backs it up.
- You want a closing proof point under the body, at its natural height.

## Avoid when

- There are two to four numbers to compare side by side; use slideStats.
- The number is one attribute among many for several items; use slideTable.
- The point is how far the number moved from a before to an after; use slideDelta.
- There are many comparable values to rank by size; use slideBars.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideStat example 1, light](images/slide-stat-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideStat example 1, dark](images/slide-stat-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**2.1 days** — Median time from refund request to money back in the customer account, down from **five**.
```

:::

:::{tab-item} Text
:sync: text

```text
2.1 days — Median time from refund request to money back in the customer account, down from five.
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*2.1 days* — Median time from refund request to money back in the customer account, down from *five*."
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*2.1%20days*%20%E2%80%94%20Median%20time%20from%20refund%20request%20to%20money%20back%20in%20the%20customer%20account%2C%20down%20from%20*five*.%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideStat",
  "value": "2.1",
  "unit": "days",
  "body": "Median time from refund request to money back in the customer account, down from **five**."
}
```

:::

::::

### Example 2

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideStat example 2, light](images/slide-stat-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideStat example 2, dark](images/slide-stat-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**99.97%** — Checkout availability over the last quarter, across all three regions.
```

:::

:::{tab-item} Text
:sync: text

```text
99.97% — Checkout availability over the last quarter, across all three regions.
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*99.97%* — Checkout availability over the last quarter, across all three regions."
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*99.97%25*%20%E2%80%94%20Checkout%20availability%20over%20the%20last%20quarter%2C%20across%20all%20three%20regions.%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideStat",
  "value": "99.97%",
  "body": "Checkout availability over the last quarter, across all three regions."
}
```

:::

::::

### Example 3

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideStat example 3, light](images/slide-stat-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideStat example 3, dark](images/slide-stat-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
_value pending_ — Orders delivered inside the booked slot. The first full month of data lands in May.
```

:::

:::{tab-item} Text
:sync: text

```text
[value pending] — Orders delivered inside the booked slot. The first full month of data lands in May.
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "_value pending_ — Orders delivered inside the booked slot. The first full month of data lands in May."
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22_value%20pending_%20%E2%80%94%20Orders%20delivered%20inside%20the%20booked%20slot.%20The%20first%20full%20month%20of%20data%20lands%20in%20May.%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideStat",
  "body": "Orders delivered inside the booked slot. The first full month of data lands in May."
}
```

:::

::::
