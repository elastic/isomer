---
navigation_title: slideSource
---

# `slideSource`

Tell the audience where the numbers or claims on a slide come from, without taking attention from them.

## Use when

- The slide shows figures, counts, or findings taken from a report, a dataset, or a survey; place it last in the frame body.
- A claim on the slide would prompt “says who?” and the answer fits on one line.

## Avoid when

- The line explains or qualifies the slide’s point; put it in the slideHeading `lede`.
- The line draws a conclusion under two columns; put it in the slideSplit `footnote`.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideSource example 1, light](images/slide-source-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideSource example 1, dark](images/slide-source-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
_Source · Support tickets tagged “refund”, January to June_
```

:::

:::{tab-item} Text
:sync: text

```text
Source · Support tickets tagged “refund”, January to June
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
        "text": "Source · Support tickets tagged “refund”, January to June"
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Source%20%C2%B7%20Support%20tickets%20tagged%20%E2%80%9Crefund%E2%80%9D%2C%20January%20to%20June%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideSource",
  "text": "Support tickets tagged “refund”, January to June"
}
```

:::

::::

### Example 2

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideSource example 2, light](images/slide-source-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideSource example 2, dark](images/slide-source-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
_Source · Nightly export of `orders.csv`, counted on 3 March_
```

:::

:::{tab-item} Text
:sync: text

```text
Source · Nightly export of orders.csv, counted on 3 March
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
        "text": "Source · Nightly export of `orders.csv`, counted on 3 March"
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Source%20%C2%B7%20Nightly%20export%20of%20%60orders.csv%60%2C%20counted%20on%203%20March%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideSource",
  "text": "Nightly export of `orders.csv`, counted on 3 March"
}
```

:::

::::
