---
navigation_title: slideHeading
---

# `slideHeading`

State what a content slide proves, as a one-line claim with an optional supporting sentence.

## Use when

- Opening a page-tone content slide that has a body below the claim.
- The audience should get the point of the slide before reading its body.

## Avoid when

- The slide opens the deck; use slideTitle in an inverse frame.
- The slide opens a section; use slideSection in an inverse frame.
- The slide closes the deck; use slideClosing in an inverse frame.
- The whole slide is one sentence with nothing under it; use slideStatement.
- The point is someone else’s words; use slideQuote.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideHeading example 1, light](images/slide-heading-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideHeading example 1, dark](images/slide-heading-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# Refunds settle in two days, not five

Moving the ledger write ahead of the fraud check removed three batch windows.
```

:::

:::{tab-item} Text
:sync: text

```text
REFUNDS SETTLE IN TWO DAYS, NOT FIVE
Moving the ledger write ahead of the fraud check removed three batch windows.
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
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%22Refunds%20settle%20in%20two%20days%2C%20not%20five%22%2C%22emoji%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Moving%20the%20ledger%20write%20ahead%20of%20the%20fraud%20check%20removed%20three%20batch%20windows.%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideHeading",
  "title": "Refunds settle in two days, not five",
  "lede": "Moving the ledger write ahead of the fraud check removed three batch windows."
}
```

:::

::::

### Example 2

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideHeading example 2, light](images/slide-heading-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideHeading example 2, dark](images/slide-heading-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# Every region now reads from one catalog
```

:::

:::{tab-item} Text
:sync: text

```text
EVERY REGION NOW READS FROM ONE CATALOG
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
      "text": "Every region now reads from one catalog",
      "emoji": true
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%22Every%20region%20now%20reads%20from%20one%20catalog%22%2C%22emoji%22%3Atrue%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideHeading",
  "title": "Every region now reads from one catalog"
}
```

:::

::::

### Example 3

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideHeading example 3, light](images/slide-heading-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideHeading example 3, dark](images/slide-heading-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# Refunds settle in two days, not five, because the ledger writes first

Moving the ledger write ahead of the fraud check removed three batch windows, so the money reaches the customer before the weekend ever starts.
```

:::

:::{tab-item} Text
:sync: text

```text
REFUNDS SETTLE IN TWO DAYS, NOT FIVE, BECAUSE THE LEDGER WRITES FIRST
Moving the ledger write ahead of the fraud check removed three batch windows, so the money reaches the customer before the weekend ever starts.
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
      "text": "Refunds settle in two days, not five, because the ledger writes first",
      "emoji": true
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "Moving the ledger write ahead of the fraud check removed three batch windows, so the money reaches the customer before the weekend ever starts."
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%22Refunds%20settle%20in%20two%20days%2C%20not%20five%2C%20because%20the%20ledger%20writes%20first%22%2C%22emoji%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Moving%20the%20ledger%20write%20ahead%20of%20the%20fraud%20check%20removed%20three%20batch%20windows%2C%20so%20the%20money%20reaches%20the%20customer%20before%20the%20weekend%20ever%20starts.%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideHeading",
  "title": "Refunds settle in two days, not five, because the ledger writes first",
  "lede": "Moving the ledger write ahead of the fraud check removed three batch windows, so the money reaches the customer before the weekend ever starts."
}
```

:::

::::
