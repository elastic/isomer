---
navigation_title: slideStatement
---

# `slideStatement`

Land one claim the audience should remember, set large on a slide of its own.

## Use when

- The slide’s whole point is a single sentence, and anything more would dilute it.
- A section needs a pause between denser slides to state its thesis.

## Avoid when

- The claim needs supporting copy or a diagram; open with slideHeading and add a body primitive.
- The sentence is someone else’s words; use slideQuote.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideStatement example 1, light](images/slide-statement-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideStatement example 1, dark](images/slide-statement-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# A refund is **a promise**, not a transaction.
```

:::

:::{tab-item} Text
:sync: text

```text
A REFUND IS A PROMISE, NOT A TRANSACTION.
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
      "text": "A refund is a promise, not a transaction.",
      "emoji": true
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%22A%20refund%20is%20a%20promise%2C%20not%20a%20transaction.%22%2C%22emoji%22%3Atrue%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideStatement",
  "text": "A refund is **a promise**, not a transaction."
}
```

:::

::::

### Example 2

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideStatement example 2, light](images/slide-statement-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideStatement example 2, dark](images/slide-statement-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# Customers stopped calling support once the app told them **when** the refund would land and **which card** it would reach.
```

:::

:::{tab-item} Text
:sync: text

```text
CUSTOMERS STOPPED CALLING SUPPORT ONCE THE APP TOLD THEM WHEN THE REFUND WOULD LAND AND WHICH CARD IT WOULD REACH.
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
      "text": "Customers stopped calling support once the app told them when the refund would land and which card it would reach.",
      "emoji": true
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%22Customers%20stopped%20calling%20support%20once%20the%20app%20told%20them%20when%20the%20refund%20would%20land%20and%20which%20card%20it%20would%20reach.%22%2C%22emoji%22%3Atrue%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideStatement",
  "text": "Customers stopped calling support once the app told them **when** the refund would land and **which card** it would reach."
}
```

:::

::::
