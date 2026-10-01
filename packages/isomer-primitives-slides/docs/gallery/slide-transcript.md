---
navigation_title: slideTranscript
---

# `slideTranscript`

Let the reader follow a short exchange between a person, a model, and the program hosting it, turn by turn.

## Use when

- You are replaying what an assistant was asked, what it answered, and how the host responded.
- The slide shows a retry: a bad answer, the error it got back, and the fixed answer.

## Avoid when

- Only one side speaks, as a snippet or an output; use slideCode.
- The exchange needs more than four turns; split it across two slides, each with its own slideTranscript.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideTranscript example 1, light](images/slide-transcript-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTranscript example 1, dark](images/slide-transcript-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
**BOOKING A DELIVERY SLOT**

**USER**

Deliver my groceries tomorrow morning.

**MODEL**

```text
{"action":"book","window":"tomorrow"}
```

**HOST**

```text
window: expected a start and end time
```

**MODEL**

```text
{"action":"book","window":{"start":"08:00","end":"10:00"}}
```
````

:::

:::{tab-item} Text
:sync: text

```text
BOOKING A DELIVERY SLOT
USER: Deliver my groceries tomorrow morning.
MODEL: {"action":"book","window":"tomorrow"}
HOST: window: expected a start and end time
MODEL: {"action":"book","window":{"start":"08:00","end":"10:00"}}
```

:::

:::{tab-item} Slack
:sync: slack

````json
[
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "*BOOKING A DELIVERY SLOT*"
      }
    ]
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*USER*\nDeliver my groceries tomorrow morning."
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*MODEL*\n```\n{\"action\":\"book\",\"window\":\"tomorrow\"}\n```"
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*HOST*\n```\nwindow: expected a start and end time\n```"
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*MODEL*\n```\n{\"action\":\"book\",\"window\":{\"start\":\"08:00\",\"end\":\"10:00\"}}\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*BOOKING%20A%20DELIVERY%20SLOT*%22%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*USER*%5CnDeliver%20my%20groceries%20tomorrow%20morning.%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*MODEL*%5Cn%60%60%60%5Cn%7B%5C%22action%5C%22%3A%5C%22book%5C%22%2C%5C%22window%5C%22%3A%5C%22tomorrow%5C%22%7D%5Cn%60%60%60%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*HOST*%5Cn%60%60%60%5Cnwindow%3A%20expected%20a%20start%20and%20end%20time%5Cn%60%60%60%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*MODEL*%5Cn%60%60%60%5Cn%7B%5C%22action%5C%22%3A%5C%22book%5C%22%2C%5C%22window%5C%22%3A%7B%5C%22start%5C%22%3A%5C%2208%3A00%5C%22%2C%5C%22end%5C%22%3A%5C%2210%3A00%5C%22%7D%7D%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTranscript",
  "label": "Booking a delivery slot",
  "turns": [
    {
      "role": "user",
      "text": "Deliver my groceries tomorrow morning."
    },
    {
      "role": "model",
      "format": "code",
      "text": "{\"action\":\"book\",\"window\":\"tomorrow\"}"
    },
    {
      "role": "host",
      "format": "code",
      "text": "window: expected a start and end time"
    },
    {
      "role": "model",
      "format": "code",
      "text": "{\"action\":\"book\",\"window\":{\"start\":\"08:00\",\"end\":\"10:00\"}}"
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

![slideTranscript example 2, light](images/slide-transcript-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTranscript example 2, dark](images/slide-transcript-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**USER**

Why did the nightly build fail?

**MODEL**

The lockfile changed without a version bump.\
Run the install step again.
```

:::

:::{tab-item} Text
:sync: text

```text
USER: Why did the nightly build fail?
MODEL: The lockfile changed without a version bump.
Run the install step again.
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
      "text": "*USER*\nWhy did the nightly build fail?"
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*MODEL*\nThe lockfile changed without a version bump.\nRun the install step again."
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*USER*%5CnWhy%20did%20the%20nightly%20build%20fail%3F%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*MODEL*%5CnThe%20lockfile%20changed%20without%20a%20version%20bump.%5CnRun%20the%20install%20step%20again.%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTranscript",
  "turns": [
    {
      "role": "user",
      "text": "Why did the nightly build fail?"
    },
    {
      "role": "model",
      "text": "The lockfile changed without a version bump.\nRun the install step again."
    }
  ]
}
```

:::

::::
