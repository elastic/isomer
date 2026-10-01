---
navigation_title: slideDefinitions
---

# `slideDefinitions`

Teach the audience a few terms they need before the rest of the talk makes sense.

## Use when

- You introduce vocabulary the audience will hear again on later slides.
- Each item is a name with a one-sentence meaning, and the name is the thing to remember.

## Avoid when

- The items are short facts rather than terms to learn; use slideList.
- Each item has several attributes to compare; use slideTable.
- The items split by who owns them; use slideTerritoryGroup.
- The terms connect to each other and the links matter; use slideGraph.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideDefinitions example 1, light](images/slide-definitions-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideDefinitions example 1, dark](images/slide-definitions-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- **authorization**: The bank holds the funds. **Nothing has moved yet.**
- **capture**: The merchant claims the held funds, usually at shipment.
- **settlement**: The money lands in the merchant account, one to two days later.
```

:::

:::{tab-item} Text
:sync: text

```text
authorization: The bank holds the funds. Nothing has moved yet.
capture: The merchant claims the held funds, usually at shipment.
settlement: The money lands in the merchant account, one to two days later.
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "section",
    "fields": [
      {
        "type": "mrkdwn",
        "text": "*authorization*\nThe bank holds the funds. *Nothing has moved yet.*"
      },
      {
        "type": "mrkdwn",
        "text": "*capture*\nThe merchant claims the held funds, usually at shipment."
      },
      {
        "type": "mrkdwn",
        "text": "*settlement*\nThe money lands in the merchant account, one to two days later."
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22fields%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*authorization*%5CnThe%20bank%20holds%20the%20funds.%20*Nothing%20has%20moved%20yet.*%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*capture*%5CnThe%20merchant%20claims%20the%20held%20funds%2C%20usually%20at%20shipment.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*settlement*%5CnThe%20money%20lands%20in%20the%20merchant%20account%2C%20one%20to%20two%20days%20later.%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideDefinitions",
  "items": [
    {
      "term": "authorization",
      "body": "The bank holds the funds. **Nothing has moved yet.**"
    },
    {
      "term": "capture",
      "body": "The merchant claims the held funds, usually at shipment."
    },
    {
      "term": "settlement",
      "body": "The money lands in the merchant account, one to two days later."
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

![slideDefinitions example 2, light](images/slide-definitions-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideDefinitions example 2, dark](images/slide-definitions-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- **blameless review**: An incident write-up that names causes and fixes, never people.
```

:::

:::{tab-item} Text
:sync: text

```text
blameless review: An incident write-up that names causes and fixes, never people.
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "section",
    "fields": [
      {
        "type": "mrkdwn",
        "text": "*blameless review*\nAn incident write-up that names causes and fixes, never people."
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22fields%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*blameless%20review*%5CnAn%20incident%20write-up%20that%20names%20causes%20and%20fixes%2C%20never%20people.%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideDefinitions",
  "items": [
    {
      "term": "blameless review",
      "body": "An incident write-up that names causes and fixes, never people."
    }
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

![slideDefinitions example 3, light](images/slide-definitions-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideDefinitions example 3, dark](images/slide-definitions-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- **picker**: Walks the store aisles and fills the basket.
- **substitute**: A replacement item the customer approved.
- **slot**: A one-hour delivery window the customer booked.
- **handoff**: The moment a bagged order leaves the store.
- **dasher**: Drives the order from the store to the door.
- **drop**: Proof of delivery: a photo and a timestamp.
```

:::

:::{tab-item} Text
:sync: text

```text
picker: Walks the store aisles and fills the basket.
substitute: A replacement item the customer approved.
slot: A one-hour delivery window the customer booked.
handoff: The moment a bagged order leaves the store.
dasher: Drives the order from the store to the door.
drop: Proof of delivery: a photo and a timestamp.
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "section",
    "fields": [
      {
        "type": "mrkdwn",
        "text": "*picker*\nWalks the store aisles and fills the basket."
      },
      {
        "type": "mrkdwn",
        "text": "*substitute*\nA replacement item the customer approved."
      },
      {
        "type": "mrkdwn",
        "text": "*slot*\nA one-hour delivery window the customer booked."
      },
      {
        "type": "mrkdwn",
        "text": "*handoff*\nThe moment a bagged order leaves the store."
      },
      {
        "type": "mrkdwn",
        "text": "*dasher*\nDrives the order from the store to the door."
      },
      {
        "type": "mrkdwn",
        "text": "*drop*\nProof of delivery: a photo and a timestamp."
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22fields%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*picker*%5CnWalks%20the%20store%20aisles%20and%20fills%20the%20basket.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*substitute*%5CnA%20replacement%20item%20the%20customer%20approved.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*slot*%5CnA%20one-hour%20delivery%20window%20the%20customer%20booked.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*handoff*%5CnThe%20moment%20a%20bagged%20order%20leaves%20the%20store.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*dasher*%5CnDrives%20the%20order%20from%20the%20store%20to%20the%20door.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*drop*%5CnProof%20of%20delivery%3A%20a%20photo%20and%20a%20timestamp.%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideDefinitions",
  "items": [
    {
      "term": "picker",
      "body": "Walks the store aisles and fills the basket."
    },
    {
      "term": "substitute",
      "body": "A replacement item the customer approved."
    },
    {
      "term": "slot",
      "body": "A one-hour delivery window the customer booked."
    },
    {
      "term": "handoff",
      "body": "The moment a bagged order leaves the store."
    },
    {
      "term": "dasher",
      "body": "Drives the order from the store to the door."
    },
    {
      "term": "drop",
      "body": "Proof of delivery: a photo and a timestamp."
    }
  ]
}
```

:::

::::
