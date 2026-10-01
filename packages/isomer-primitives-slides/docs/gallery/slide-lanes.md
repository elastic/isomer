---
navigation_title: slideLanes
---

# `slideLanes`

Contrast two different routes to the same destination, so the audience sees where they differ and where they meet.

## Use when

- Two sources or workflows take different steps and end at one shared step.
- You want a note under the diagram on how each path differs.

## Avoid when

- There is only one path; use slidePipeline.
- One source feeds many targets instead of two feeding one; use slideFanout.
- The two sides are opposing claims rather than routes; use slideSplit.
- Participants send messages back and forth rather than following a path; use slideSequence.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideLanes example 1, light](images/slide-lanes-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideLanes example 1, dark](images/slide-lanes-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- ● **WEB**: Basket → Address → Slot → Review → Place order
- **PHONE**: Call → Agent form → Read back → Confirm → Place order

**Self-serve**: The customer picks the slot. Validation runs on every field as they type.

**Assisted**: An agent keys the order while the customer waits, then reads it back before placing it.
```

:::

:::{tab-item} Text
:sync: text

```text
● WEB: Basket → Address → Slot → Review → Place order
PHONE: Call → Agent form → Read back → Confirm → Place order

Self-serve: The customer picks the slot. Validation runs on every field as they type.
Assisted: An agent keys the order while the customer waits, then reads it back before placing it.
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
      "text": "● *WEB*: Basket → Address → Slot → Review → Place order\n*PHONE*: Call → Agent form → Read back → Confirm → Place order"
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
    "fields": [
      {
        "type": "mrkdwn",
        "text": "*Self-serve*\nThe customer picks the slot. Validation runs on every field as they type."
      },
      {
        "type": "mrkdwn",
        "text": "*Assisted*\nAn agent keys the order while the customer waits, then reads it back before placing it."
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%E2%97%8F%20*WEB*%3A%20Basket%20%E2%86%92%20Address%20%E2%86%92%20Slot%20%E2%86%92%20Review%20%E2%86%92%20Place%20order%5Cn*PHONE*%3A%20Call%20%E2%86%92%20Agent%20form%20%E2%86%92%20Read%20back%20%E2%86%92%20Confirm%20%E2%86%92%20Place%20order%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22fields%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Self-serve*%5CnThe%20customer%20picks%20the%20slot.%20Validation%20runs%20on%20every%20field%20as%20they%20type.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Assisted*%5CnAn%20agent%20keys%20the%20order%20while%20the%20customer%20waits%2C%20then%20reads%20it%20back%20before%20placing%20it.%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideLanes",
  "lanes": [
    {
      "label": "Web",
      "steps": [
        "Basket",
        "Address",
        "Slot",
        "Review"
      ],
      "tone": "primary"
    },
    {
      "label": "Phone",
      "steps": [
        "Call",
        "Agent form",
        "Read back",
        "Confirm"
      ]
    }
  ],
  "join": "Place order",
  "notes": [
    {
      "title": "Self-serve",
      "body": "The customer picks the slot. Validation runs on every field as they type."
    },
    {
      "title": "Assisted",
      "body": "An agent keys the order while the customer waits, then reads it back before placing it."
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

![slideLanes example 2, light](images/slide-lanes-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideLanes example 2, dark](images/slide-lanes-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- **HOTFIX**: Patch → Review → Deploy
- **RELEASE**: Branch → Soak → Sign-off → Tag → Notes → Deploy
```

:::

:::{tab-item} Text
:sync: text

```text
HOTFIX: Patch → Review → Deploy
RELEASE: Branch → Soak → Sign-off → Tag → Notes → Deploy
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
      "text": "*HOTFIX*: Patch → Review → Deploy\n*RELEASE*: Branch → Soak → Sign-off → Tag → Notes → Deploy"
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*HOTFIX*%3A%20Patch%20%E2%86%92%20Review%20%E2%86%92%20Deploy%5Cn*RELEASE*%3A%20Branch%20%E2%86%92%20Soak%20%E2%86%92%20Sign-off%20%E2%86%92%20Tag%20%E2%86%92%20Notes%20%E2%86%92%20Deploy%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideLanes",
  "lanes": [
    {
      "label": "Hotfix",
      "steps": [
        "Patch",
        "Review"
      ]
    },
    {
      "label": "Release",
      "steps": [
        "Branch",
        "Soak",
        "Sign-off",
        "Tag",
        "Notes"
      ]
    }
  ],
  "join": "Deploy"
}
```

:::

::::

### Example 3

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideLanes example 3, light](images/slide-lanes-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideLanes example 3, dark](images/slide-lanes-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- ● **CARD**: Tokenize → Authorize → Capture
- ○ **WALLET**: Redirect → Approve → Callback → Capture

**Card is instant**: Authorization returns in **one round trip**.

**Wallet waits**: The customer leaves the page to approve.

**Same capture**: Both settle through one `capture` call.

**Same refunds**: Refunds never need to know the path.
```

:::

:::{tab-item} Text
:sync: text

```text
● CARD: Tokenize → Authorize → Capture
○ WALLET: Redirect → Approve → Callback → Capture

Card is instant: Authorization returns in one round trip.
Wallet waits: The customer leaves the page to approve.
Same capture: Both settle through one capture call.
Same refunds: Refunds never need to know the path.
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
      "text": "● *CARD*: Tokenize → Authorize → Capture\n○ *WALLET*: Redirect → Approve → Callback → Capture"
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
    "fields": [
      {
        "type": "mrkdwn",
        "text": "*Card is instant*\nAuthorization returns in *one round trip*."
      },
      {
        "type": "mrkdwn",
        "text": "*Wallet waits*\nThe customer leaves the page to approve."
      },
      {
        "type": "mrkdwn",
        "text": "*Same capture*\nBoth settle through one `capture` call."
      },
      {
        "type": "mrkdwn",
        "text": "*Same refunds*\nRefunds never need to know the path."
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%E2%97%8F%20*CARD*%3A%20Tokenize%20%E2%86%92%20Authorize%20%E2%86%92%20Capture%5Cn%E2%97%8B%20*WALLET*%3A%20Redirect%20%E2%86%92%20Approve%20%E2%86%92%20Callback%20%E2%86%92%20Capture%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22fields%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Card%20is%20instant*%5CnAuthorization%20returns%20in%20*one%20round%20trip*.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Wallet%20waits*%5CnThe%20customer%20leaves%20the%20page%20to%20approve.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Same%20capture*%5CnBoth%20settle%20through%20one%20%60capture%60%20call.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Same%20refunds*%5CnRefunds%20never%20need%20to%20know%20the%20path.%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideLanes",
  "lanes": [
    {
      "label": "Card",
      "steps": [
        "Tokenize",
        "Authorize"
      ],
      "tone": "primary"
    },
    {
      "label": "Wallet",
      "steps": [
        "Redirect",
        "Approve",
        "Callback"
      ],
      "tone": "accent"
    }
  ],
  "join": "Capture",
  "notes": [
    {
      "title": "Card is instant",
      "body": "Authorization returns in **one round trip**."
    },
    {
      "title": "Wallet waits",
      "body": "The customer leaves the page to approve."
    },
    {
      "title": "Same capture",
      "body": "Both settle through one `capture` call."
    },
    {
      "title": "Same refunds",
      "body": "Refunds never need to know the path."
    }
  ]
}
```

:::

::::
