---
navigation_title: slideQuote
---

# `slideQuote`

Let a customer, a colleague, or a document make the point in their own words, with the source named.

## Use when

- Someone else’s words carry more weight than a paraphrase would.
- A slide should pause on one piece of evidence from a person or a source.

## Avoid when

- The sentence is your own claim; use slideStatement.
- Several people speak in turn; use slideTranscript.
- The source is a report or dataset behind the slide’s figures; cite it with slideSource.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideQuote example 1, light](images/slide-quote-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideQuote example 1, dark](images/slide-quote-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
> “I stopped checking my bank app once the refund email said **which day** it would land.”
>
> — Priya N., Customer interview, March
```

:::

:::{tab-item} Text
:sync: text

```text
“I stopped checking my bank app once the refund email said which day it would land.”
— Priya N., Customer interview, March
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
      "text": "> “I stopped checking my bank app once the refund email said *which day* it would land.”\n> — Priya N., Customer interview, March"
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%3E%20%E2%80%9CI%20stopped%20checking%20my%20bank%20app%20once%20the%20refund%20email%20said%20*which%20day*%20it%20would%20land.%E2%80%9D%5Cn%3E%20%E2%80%94%20Priya%20N.%2C%20Customer%20interview%2C%20March%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideQuote",
  "text": "I stopped checking my bank app once the refund email said **which day** it would land.",
  "source": "Priya N.",
  "context": "Customer interview, March"
}
```

:::

::::

### Example 2

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideQuote example 2, light](images/slide-quote-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideQuote example 2, dark](images/slide-quote-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
> “Ship the boring version first.”
>
> — Payments team charter
```

:::

:::{tab-item} Text
:sync: text

```text
“Ship the boring version first.”
— Payments team charter
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
      "text": "> “Ship the boring version first.”\n> — Payments team charter"
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%3E%20%E2%80%9CShip%20the%20boring%20version%20first.%E2%80%9D%5Cn%3E%20%E2%80%94%20Payments%20team%20charter%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideQuote",
  "text": "Ship the boring version first.",
  "source": "Payments team charter"
}
```

:::

::::

### Example 3

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideQuote example 3, light](images/slide-quote-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideQuote example 3, dark](images/slide-quote-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
> “We used to open a ticket for every refund that took longer than a week, and most weeks that was a third of them. Now the app tells the customer the day the money lands, and the only tickets left are the ones where the bank itself is late, which we can **finally** chase by name.”
>
> — Dana K., Support lead, quarterly review
```

:::

:::{tab-item} Text
:sync: text

```text
“We used to open a ticket for every refund that took longer than a week, and most weeks that was a third of them. Now the app tells the customer the day the money lands, and the only tickets left are the ones where the bank itself is late, which we can finally chase by name.”
— Dana K., Support lead, quarterly review
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
      "text": "> “We used to open a ticket for every refund that took longer than a week, and most weeks that was a third of them. Now the app tells the customer the day the money lands, and the only tickets left are the ones where the bank itself is late, which we can *finally* chase by name.”\n> — Dana K., Support lead, quarterly review"
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%3E%20%E2%80%9CWe%20used%20to%20open%20a%20ticket%20for%20every%20refund%20that%20took%20longer%20than%20a%20week%2C%20and%20most%20weeks%20that%20was%20a%20third%20of%20them.%20Now%20the%20app%20tells%20the%20customer%20the%20day%20the%20money%20lands%2C%20and%20the%20only%20tickets%20left%20are%20the%20ones%20where%20the%20bank%20itself%20is%20late%2C%20which%20we%20can%20*finally*%20chase%20by%20name.%E2%80%9D%5Cn%3E%20%E2%80%94%20Dana%20K.%2C%20Support%20lead%2C%20quarterly%20review%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideQuote",
  "text": "We used to open a ticket for every refund that took longer than a week, and most weeks that was a third of them. Now the app tells the customer the day the money lands, and the only tickets left are the ones where the bank itself is late, which we can **finally** chase by name.",
  "source": "Dana K.",
  "context": "Support lead, quarterly review"
}
```

:::

::::
