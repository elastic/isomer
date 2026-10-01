---
navigation_title: slideSequence
---

# `slideSequence`

Show who says what to whom, in order, so the audience can follow a conversation between systems or people step by step.

## Use when

- A request passes back and forth between three to five participants, and the order of the messages is the point.
- You want to show a failure and its recovery, such as a rejected call and the retry that follows.

## Avoid when

- Each step hands off to the next and nothing comes back; use slidePipeline.
- Two routes converge on one step; use slideLanes.
- The messages are whole turns of text between a user, a model, and a host; use slideTranscript.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideSequence example 1, light](images/slide-sequence-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideSequence example 1, dark](images/slide-sequence-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
1. shopper → ● store: Place order
2. ● store → payments: `authorize(card)`
3. payments → ○ bank: Charge request
4. ○ bank → payments: `DECLINED 51`
5. ● store → shopper: Try another card
6. shopper → ● store: Second card
7. payments → ● store: Approved
```

:::

:::{tab-item} Text
:sync: text

```text
1. shopper → ● store: Place order
2. ● store → payments: authorize(card)
3. payments → ○ bank: Charge request
4. ○ bank → payments: DECLINED 51
5. ● store → shopper: Try another card
6. shopper → ● store: Second card
7. payments → ● store: Approved
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
        "type": "rich_text_list",
        "style": "ordered",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "shopper → ● store: "
              },
              {
                "type": "text",
                "text": "Place order"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "● store → payments: "
              },
              {
                "type": "text",
                "text": "authorize(card)",
                "style": {
                  "code": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "payments → ○ bank: "
              },
              {
                "type": "text",
                "text": "Charge request"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "○ bank → payments: "
              },
              {
                "type": "text",
                "text": "DECLINED 51",
                "style": {
                  "code": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "● store → shopper: "
              },
              {
                "type": "text",
                "text": "Try another card"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "shopper → ● store: "
              },
              {
                "type": "text",
                "text": "Second card"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "payments → ● store: "
              },
              {
                "type": "text",
                "text": "Approved"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22ordered%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22shopper%20%E2%86%92%20%E2%97%8F%20store%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Place%20order%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20store%20%E2%86%92%20payments%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22authorize(card)%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22payments%20%E2%86%92%20%E2%97%8B%20bank%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Charge%20request%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8B%20bank%20%E2%86%92%20payments%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22DECLINED%2051%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20store%20%E2%86%92%20shopper%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Try%20another%20card%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22shopper%20%E2%86%92%20%E2%97%8F%20store%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Second%20card%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22payments%20%E2%86%92%20%E2%97%8F%20store%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Approved%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideSequence",
  "actors": [
    {
      "id": "shopper",
      "label": "shopper"
    },
    {
      "id": "store",
      "label": "store",
      "tone": "primary"
    },
    {
      "id": "psp",
      "label": "payments"
    },
    {
      "id": "bank",
      "label": "bank",
      "tone": "accent"
    }
  ],
  "messages": [
    {
      "from": "shopper",
      "to": "store",
      "label": "Place order"
    },
    {
      "from": "store",
      "to": "psp",
      "label": "`authorize(card)`"
    },
    {
      "from": "psp",
      "to": "bank",
      "label": "Charge request"
    },
    {
      "from": "bank",
      "to": "psp",
      "label": "`DECLINED 51`"
    },
    {
      "from": "store",
      "to": "shopper",
      "label": "Try another card"
    },
    {
      "from": "shopper",
      "to": "store",
      "label": "Second card"
    },
    {
      "from": "psp",
      "to": "store",
      "label": "Approved"
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

![slideSequence example 2, light](images/slide-sequence-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideSequence example 2, dark](images/slide-sequence-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
1. diner → ● app: Order two ramen
2. ● app → bank: `hold(24.00)`
3. bank → ● app: Hold approved
4. ● app → ○ kitchen: New ticket
5. ○ kitchen → ● app: Ready in **15 min**
6. ● app → courier: Pick up at 7:40
7. courier → ○ kitchen: Collect the bag
8. courier → diner: Delivered
9. ● app → bank: `capture(24.00)`
10. ● app → diner: Receipt
```

:::

:::{tab-item} Text
:sync: text

```text
1. diner → ● app: Order two ramen
2. ● app → bank: hold(24.00)
3. bank → ● app: Hold approved
4. ● app → ○ kitchen: New ticket
5. ○ kitchen → ● app: Ready in 15 min
6. ● app → courier: Pick up at 7:40
7. courier → ○ kitchen: Collect the bag
8. courier → diner: Delivered
9. ● app → bank: capture(24.00)
10. ● app → diner: Receipt
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
        "type": "rich_text_list",
        "style": "ordered",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "diner → ● app: "
              },
              {
                "type": "text",
                "text": "Order two ramen"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "● app → bank: "
              },
              {
                "type": "text",
                "text": "hold(24.00)",
                "style": {
                  "code": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "bank → ● app: "
              },
              {
                "type": "text",
                "text": "Hold approved"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "● app → ○ kitchen: "
              },
              {
                "type": "text",
                "text": "New ticket"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "○ kitchen → ● app: "
              },
              {
                "type": "text",
                "text": "Ready in "
              },
              {
                "type": "text",
                "text": "15 min",
                "style": {
                  "bold": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "● app → courier: "
              },
              {
                "type": "text",
                "text": "Pick up at 7:40"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "courier → ○ kitchen: "
              },
              {
                "type": "text",
                "text": "Collect the bag"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "courier → diner: "
              },
              {
                "type": "text",
                "text": "Delivered"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "● app → bank: "
              },
              {
                "type": "text",
                "text": "capture(24.00)",
                "style": {
                  "code": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "● app → diner: "
              },
              {
                "type": "text",
                "text": "Receipt"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22ordered%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22diner%20%E2%86%92%20%E2%97%8F%20app%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Order%20two%20ramen%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20app%20%E2%86%92%20bank%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22hold(24.00)%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22bank%20%E2%86%92%20%E2%97%8F%20app%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Hold%20approved%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20app%20%E2%86%92%20%E2%97%8B%20kitchen%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22New%20ticket%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8B%20kitchen%20%E2%86%92%20%E2%97%8F%20app%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Ready%20in%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%2215%20min%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20app%20%E2%86%92%20courier%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Pick%20up%20at%207%3A40%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22courier%20%E2%86%92%20%E2%97%8B%20kitchen%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Collect%20the%20bag%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22courier%20%E2%86%92%20diner%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Delivered%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20app%20%E2%86%92%20bank%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22capture(24.00)%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20app%20%E2%86%92%20diner%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Receipt%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideSequence",
  "actors": [
    {
      "id": "diner",
      "label": "diner"
    },
    {
      "id": "app",
      "label": "app",
      "tone": "primary"
    },
    {
      "id": "kitchen",
      "label": "kitchen",
      "tone": "accent"
    },
    {
      "id": "courier",
      "label": "courier"
    },
    {
      "id": "bank",
      "label": "bank"
    }
  ],
  "messages": [
    {
      "from": "diner",
      "to": "app",
      "label": "Order two ramen"
    },
    {
      "from": "app",
      "to": "bank",
      "label": "`hold(24.00)`"
    },
    {
      "from": "bank",
      "to": "app",
      "label": "Hold approved"
    },
    {
      "from": "app",
      "to": "kitchen",
      "label": "New ticket"
    },
    {
      "from": "kitchen",
      "to": "app",
      "label": "Ready in **15 min**"
    },
    {
      "from": "app",
      "to": "courier",
      "label": "Pick up at 7:40"
    },
    {
      "from": "courier",
      "to": "kitchen",
      "label": "Collect the bag"
    },
    {
      "from": "courier",
      "to": "diner",
      "label": "Delivered"
    },
    {
      "from": "app",
      "to": "bank",
      "label": "`capture(24.00)`"
    },
    {
      "from": "app",
      "to": "diner",
      "label": "Receipt"
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

![slideSequence example 3, light](images/slide-sequence-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideSequence example 3, dark](images/slide-sequence-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
1. user → ● site: Forgot password
2. ● site → ○ mail: Send reset link
3. ○ mail → user: Reset email
4. user → ● site: `POST /reset`
```

:::

:::{tab-item} Text
:sync: text

```text
1. user → ● site: Forgot password
2. ● site → ○ mail: Send reset link
3. ○ mail → user: Reset email
4. user → ● site: POST /reset
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
        "type": "rich_text_list",
        "style": "ordered",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "user → ● site: "
              },
              {
                "type": "text",
                "text": "Forgot password"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "● site → ○ mail: "
              },
              {
                "type": "text",
                "text": "Send reset link"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "○ mail → user: "
              },
              {
                "type": "text",
                "text": "Reset email"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "user → ● site: "
              },
              {
                "type": "text",
                "text": "POST /reset",
                "style": {
                  "code": true
                }
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22ordered%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22user%20%E2%86%92%20%E2%97%8F%20site%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Forgot%20password%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20site%20%E2%86%92%20%E2%97%8B%20mail%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Send%20reset%20link%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8B%20mail%20%E2%86%92%20user%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Reset%20email%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22user%20%E2%86%92%20%E2%97%8F%20site%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22POST%20%2Freset%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideSequence",
  "actors": [
    {
      "id": "user",
      "label": "user"
    },
    {
      "id": "site",
      "label": "site",
      "tone": "primary"
    },
    {
      "id": "mail",
      "label": "mail",
      "tone": "accent"
    }
  ],
  "messages": [
    {
      "from": "user",
      "to": "site",
      "label": "Forgot password"
    },
    {
      "from": "site",
      "to": "mail",
      "label": "Send reset link"
    },
    {
      "from": "mail",
      "to": "user",
      "label": "Reset email"
    },
    {
      "from": "user",
      "to": "site",
      "label": "`POST /reset`"
    }
  ]
}
```

:::

::::
