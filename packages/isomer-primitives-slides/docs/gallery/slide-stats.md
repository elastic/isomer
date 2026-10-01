---
navigation_title: slideStats
---

# `slideStats`

Let the audience compare two to four numbers at a glance, each with a label and one line of context.

## Use when

- The slide is the numbers: counts, rates, or durations the audience should remember.
- Several measures of the same thing belong side by side.
- A number is not measured yet but its place on the slide is decided; leave `value` out.

## Avoid when

- There is one headline number supporting other content; use slideStat.
- Each item has several attributes, not one number; use slideTable.
- The numbers are one measure before and after a change; use slideDelta.
- There are more than four values, or their relative size is the point; use slideBars.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideStats example 1, light](images/slide-stats-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideStats example 1, dark](images/slide-stats-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- **3** Regions: Checkout now runs **active-active** in each of them.
- **40 ms** p99 latency: Measured at the edge during the spring sale peak.
- **0** Failed payments: Across two regional failovers in the same week.
```

:::

:::{tab-item} Text
:sync: text

```text
3 Regions: Checkout now runs active-active in each of them.
40 ms p99 latency: Measured at the edge during the spring sale peak.
0 Failed payments: Across two regional failovers in the same week.
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
        "text": "*3* Regions: Checkout now runs *active-active* in each of them."
      },
      {
        "type": "mrkdwn",
        "text": "*40 ms* p99 latency: Measured at the edge during the spring sale peak."
      },
      {
        "type": "mrkdwn",
        "text": "*0* Failed payments: Across two regional failovers in the same week."
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22fields%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*3*%20Regions%3A%20Checkout%20now%20runs%20*active-active*%20in%20each%20of%20them.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*40%20ms*%20p99%20latency%3A%20Measured%20at%20the%20edge%20during%20the%20spring%20sale%20peak.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*0*%20Failed%20payments%3A%20Across%20two%20regional%20failovers%20in%20the%20same%20week.%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideStats",
  "items": [
    {
      "value": "3",
      "label": "Regions",
      "body": "Checkout now runs **active-active** in each of them."
    },
    {
      "value": "40",
      "unit": "ms",
      "label": "p99 latency",
      "body": "Measured at the edge during the spring sale peak."
    },
    {
      "value": "0",
      "label": "Failed payments",
      "body": "Across two regional failovers in the same week."
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

![slideStats example 2, light](images/slide-stats-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideStats example 2, dark](images/slide-stats-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- **12 min** Time to detect: From the first failed health check to the page.
- **47 min** Time to recover: Most of it spent waiting on a manual cache flush.
```

:::

:::{tab-item} Text
:sync: text

```text
12 min Time to detect: From the first failed health check to the page.
47 min Time to recover: Most of it spent waiting on a manual cache flush.
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
        "text": "*12 min* Time to detect: From the first failed health check to the page."
      },
      {
        "type": "mrkdwn",
        "text": "*47 min* Time to recover: Most of it spent waiting on a manual cache flush."
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22fields%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*12%20min*%20Time%20to%20detect%3A%20From%20the%20first%20failed%20health%20check%20to%20the%20page.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*47%20min*%20Time%20to%20recover%3A%20Most%20of%20it%20spent%20waiting%20on%20a%20manual%20cache%20flush.%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideStats",
  "items": [
    {
      "value": "12",
      "unit": "min",
      "label": "Time to detect",
      "body": "From the first failed health check to the page."
    },
    {
      "value": "47",
      "unit": "min",
      "label": "Time to recover",
      "body": "Most of it spent waiting on a manual cache flush."
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

![slideStats example 3, light](images/slide-stats-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideStats example 3, dark](images/slide-stats-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- _value pending_ On time: Orders delivered inside the booked slot.
- _value pending_ Substitutions: Items swapped for an approved replacement.
- _value pending_ Refunds: Orders refunded in part or in full.
- **4.8** Rating: Average driver rating, the one number already in.
```

:::

:::{tab-item} Text
:sync: text

```text
[value pending] On time: Orders delivered inside the booked slot.
[value pending] Substitutions: Items swapped for an approved replacement.
[value pending] Refunds: Orders refunded in part or in full.
4.8 Rating: Average driver rating, the one number already in.
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
        "text": "_value pending_ On time: Orders delivered inside the booked slot."
      },
      {
        "type": "mrkdwn",
        "text": "_value pending_ Substitutions: Items swapped for an approved replacement."
      },
      {
        "type": "mrkdwn",
        "text": "_value pending_ Refunds: Orders refunded in part or in full."
      },
      {
        "type": "mrkdwn",
        "text": "*4.8* Rating: Average driver rating, the one number already in."
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22fields%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22_value%20pending_%20On%20time%3A%20Orders%20delivered%20inside%20the%20booked%20slot.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22_value%20pending_%20Substitutions%3A%20Items%20swapped%20for%20an%20approved%20replacement.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22_value%20pending_%20Refunds%3A%20Orders%20refunded%20in%20part%20or%20in%20full.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*4.8*%20Rating%3A%20Average%20driver%20rating%2C%20the%20one%20number%20already%20in.%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideStats",
  "items": [
    {
      "label": "On time",
      "body": "Orders delivered inside the booked slot."
    },
    {
      "label": "Substitutions",
      "body": "Items swapped for an approved replacement."
    },
    {
      "label": "Refunds",
      "body": "Orders refunded in part or in full."
    },
    {
      "value": "4.8",
      "label": "Rating",
      "body": "Average driver rating, the one number already in."
    }
  ]
}
```

:::

::::
