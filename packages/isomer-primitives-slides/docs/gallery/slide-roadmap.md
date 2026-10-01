---
navigation_title: slideRoadmap
---

# `slideRoadmap`

Show what is done, what comes next, and what comes after, so the audience knows where the work stands.

## Use when

- You are presenting plans by horizon, such as now, next, and later, each with a few named pieces of work.
- The audience should see which stage is under way while the stages after it stay in view.

## Avoid when

- The points are dated events that already happened; use slideTimeline.
- The columns split work by who owns it, not by when; use slideTerritoryGroup.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideRoadmap example 1, light](images/slide-roadmap-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideRoadmap example 1, dark](images/slide-roadmap-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
## ● Now · SHIPPED

- **Saved baskets**: Reorder last week’s shop in one tap
- **Card on file**: Checkout without retyping a card

## Next · IN BUILD

- **Substitutions**: Approve a swap from a message
- **Delivery slots**: Pick a one-hour window
- **Receipts**: Itemized, in the app and by `email`

## Later · PROPOSED

- **Shared lists**: One basket for the whole household
- **Price alerts**: A nudge when a staple goes on sale
- **Pantry**: Suggest what is running low
- **Recipes**: Add every ingredient in one step
```

:::

:::{tab-item} Text
:sync: text

```text
● Now · SHIPPED
- Saved baskets: Reorder last week’s shop in one tap
- Card on file: Checkout without retyping a card

Next · IN BUILD
- Substitutions: Approve a swap from a message
- Delivery slots: Pick a one-hour window
- Receipts: Itemized, in the app and by email

Later · PROPOSED
- Shared lists: One basket for the whole household
- Price alerts: A nudge when a staple goes on sale
- Pantry: Suggest what is running low
- Recipes: Add every ingredient in one step
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
        "type": "rich_text_section",
        "elements": [
          {
            "type": "text",
            "text": "● Now · SHIPPED",
            "style": {
              "bold": true
            }
          }
        ]
      },
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Saved baskets",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Reorder last week’s shop in one tap"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Card on file",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Checkout without retyping a card"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_section",
        "elements": [
          {
            "type": "text",
            "text": "Next · IN BUILD",
            "style": {
              "bold": true
            }
          }
        ]
      },
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Substitutions",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Approve a swap from a message"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Delivery slots",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Pick a one-hour window"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Receipts",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Itemized, in the app and by "
              },
              {
                "type": "text",
                "text": "email",
                "style": {
                  "code": true
                }
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_section",
        "elements": [
          {
            "type": "text",
            "text": "Later · PROPOSED",
            "style": {
              "bold": true
            }
          }
        ]
      },
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Shared lists",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "One basket for the whole household"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Price alerts",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "A nudge when a staple goes on sale"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Pantry",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Suggest what is running low"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Recipes",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Add every ingredient in one step"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20Now%20%C2%B7%20SHIPPED%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Saved%20baskets%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Reorder%20last%20week%E2%80%99s%20shop%20in%20one%20tap%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Card%20on%20file%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Checkout%20without%20retyping%20a%20card%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Next%20%C2%B7%20IN%20BUILD%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Substitutions%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Approve%20a%20swap%20from%20a%20message%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Delivery%20slots%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Pick%20a%20one-hour%20window%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Receipts%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Itemized%2C%20in%20the%20app%20and%20by%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22email%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Later%20%C2%B7%20PROPOSED%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Shared%20lists%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22One%20basket%20for%20the%20whole%20household%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Price%20alerts%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22A%20nudge%20when%20a%20staple%20goes%20on%20sale%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Pantry%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Suggest%20what%20is%20running%20low%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Recipes%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Add%20every%20ingredient%20in%20one%20step%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideRoadmap",
  "columns": [
    {
      "title": "Now",
      "status": "Shipped",
      "current": true,
      "items": [
        {
          "title": "Saved baskets",
          "body": "Reorder last week’s shop in one tap"
        },
        {
          "title": "Card on file",
          "body": "Checkout without retyping a card"
        }
      ]
    },
    {
      "title": "Next",
      "status": "In build",
      "items": [
        {
          "title": "Substitutions",
          "body": "Approve a swap from a message"
        },
        {
          "title": "Delivery slots",
          "body": "Pick a one-hour window"
        },
        {
          "title": "Receipts",
          "body": "Itemized, in the app and by `email`"
        }
      ]
    },
    {
      "title": "Later",
      "status": "Proposed",
      "items": [
        {
          "title": "Shared lists",
          "body": "One basket for the whole household"
        },
        {
          "title": "Price alerts",
          "body": "A nudge when a staple goes on sale"
        },
        {
          "title": "Pantry",
          "body": "Suggest what is running low"
        },
        {
          "title": "Recipes",
          "body": "Add every ingredient in one step"
        }
      ]
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

![slideRoadmap example 2, light](images/slide-roadmap-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideRoadmap example 2, dark](images/slide-roadmap-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
## This half · COMMITTED

- **Faster payouts**: Merchants are paid the next business day
- **Dispute inbox**: Every chargeback in one queue

## Next half · EXPLORING

- **Instant payouts**: Paid within minutes, for a small fee
```

:::

:::{tab-item} Text
:sync: text

```text
This half · COMMITTED
- Faster payouts: Merchants are paid the next business day
- Dispute inbox: Every chargeback in one queue

Next half · EXPLORING
- Instant payouts: Paid within minutes, for a small fee
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
        "type": "rich_text_section",
        "elements": [
          {
            "type": "text",
            "text": "This half · COMMITTED",
            "style": {
              "bold": true
            }
          }
        ]
      },
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Faster payouts",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Merchants are paid the next business day"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Dispute inbox",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Every chargeback in one queue"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_section",
        "elements": [
          {
            "type": "text",
            "text": "Next half · EXPLORING",
            "style": {
              "bold": true
            }
          }
        ]
      },
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Instant",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " payouts",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Paid within minutes, for a small fee"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22This%20half%20%C2%B7%20COMMITTED%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Faster%20payouts%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Merchants%20are%20paid%20the%20next%20business%20day%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Dispute%20inbox%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Every%20chargeback%20in%20one%20queue%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Next%20half%20%C2%B7%20EXPLORING%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Instant%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20payouts%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Paid%20within%20minutes%2C%20for%20a%20small%20fee%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideRoadmap",
  "columns": [
    {
      "title": "This half",
      "status": "Committed",
      "items": [
        {
          "title": "Faster payouts",
          "body": "Merchants are paid the next business day"
        },
        {
          "title": "Dispute inbox",
          "body": "Every chargeback in one queue"
        }
      ]
    },
    {
      "title": "Next half",
      "status": "Exploring",
      "items": [
        {
          "title": "**Instant** payouts",
          "body": "Paid within minutes, for a small fee"
        }
      ]
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

![slideRoadmap example 3, light](images/slide-roadmap-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideRoadmap example 3, dark](images/slide-roadmap-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
## Q1 · DONE

- **Status page**: Public, updated within five minutes
- **On-call rota**: Two engineers, weekly handover
- **Paging**: Alerts reach a phone, not an inbox
- **Runbooks**: One per alert, linked from the page

## ● Q2 · IN PROGRESS

- **Error budgets**: Each service owns a monthly budget
- **Load tests**: Run nightly against a staging copy
- **Canary deploys**: One percent of traffic goes first
- **Rollback**: One command returns the last build

## Q3 · PLANNED

- **Chaos drills**: A zone is switched off each month
- **Tracing**: Every request carries one trace id
- **Cost review**: Spend per service, every sprint
- **Game days**: Rehearse the worst outage twice a year

## Q4 · PROPOSED

- **Second region**: Serve reads if the first goes dark
- **Failover**: Writes move over in under a minute
- **Backups**: Restored and checked every week
- **Audit**: An outside review of the whole setup
```

:::

:::{tab-item} Text
:sync: text

```text
Q1 · DONE
- Status page: Public, updated within five minutes
- On-call rota: Two engineers, weekly handover
- Paging: Alerts reach a phone, not an inbox
- Runbooks: One per alert, linked from the page

● Q2 · IN PROGRESS
- Error budgets: Each service owns a monthly budget
- Load tests: Run nightly against a staging copy
- Canary deploys: One percent of traffic goes first
- Rollback: One command returns the last build

Q3 · PLANNED
- Chaos drills: A zone is switched off each month
- Tracing: Every request carries one trace id
- Cost review: Spend per service, every sprint
- Game days: Rehearse the worst outage twice a year

Q4 · PROPOSED
- Second region: Serve reads if the first goes dark
- Failover: Writes move over in under a minute
- Backups: Restored and checked every week
- Audit: An outside review of the whole setup
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
        "type": "rich_text_section",
        "elements": [
          {
            "type": "text",
            "text": "Q1 · DONE",
            "style": {
              "bold": true
            }
          }
        ]
      },
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Status page",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Public, updated within five minutes"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "On-call rota",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Two engineers, weekly handover"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Paging",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Alerts reach a phone, not an inbox"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Runbooks",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "One per alert, linked from the page"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_section",
        "elements": [
          {
            "type": "text",
            "text": "● Q2 · IN PROGRESS",
            "style": {
              "bold": true
            }
          }
        ]
      },
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Error budgets",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Each service owns a monthly budget"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Load tests",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Run nightly against a staging copy"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Canary deploys",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "One percent of traffic goes first"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Rollback",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "One command returns the last build"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_section",
        "elements": [
          {
            "type": "text",
            "text": "Q3 · PLANNED",
            "style": {
              "bold": true
            }
          }
        ]
      },
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Chaos drills",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "A zone is switched off each month"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Tracing",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Every request carries one trace id"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Cost review",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Spend per service, every sprint"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Game days",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Rehearse the worst outage twice a year"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": " "
    }
  },
  {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_section",
        "elements": [
          {
            "type": "text",
            "text": "Q4 · PROPOSED",
            "style": {
              "bold": true
            }
          }
        ]
      },
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Second region",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Serve reads if the first goes dark"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Failover",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Writes move over in under a minute"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Backups",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "Restored and checked every week"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Audit",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ": "
              },
              {
                "type": "text",
                "text": "An outside review of the whole setup"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Q1%20%C2%B7%20DONE%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Status%20page%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Public%2C%20updated%20within%20five%20minutes%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22On-call%20rota%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Two%20engineers%2C%20weekly%20handover%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Paging%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Alerts%20reach%20a%20phone%2C%20not%20an%20inbox%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Runbooks%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22One%20per%20alert%2C%20linked%20from%20the%20page%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20Q2%20%C2%B7%20IN%20PROGRESS%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Error%20budgets%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Each%20service%20owns%20a%20monthly%20budget%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Load%20tests%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Run%20nightly%20against%20a%20staging%20copy%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Canary%20deploys%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22One%20percent%20of%20traffic%20goes%20first%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Rollback%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22One%20command%20returns%20the%20last%20build%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Q3%20%C2%B7%20PLANNED%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Chaos%20drills%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22A%20zone%20is%20switched%20off%20each%20month%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Tracing%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Every%20request%20carries%20one%20trace%20id%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Cost%20review%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Spend%20per%20service%2C%20every%20sprint%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Game%20days%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Rehearse%20the%20worst%20outage%20twice%20a%20year%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Q4%20%C2%B7%20PROPOSED%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Second%20region%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Serve%20reads%20if%20the%20first%20goes%20dark%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Failover%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Writes%20move%20over%20in%20under%20a%20minute%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Backups%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Restored%20and%20checked%20every%20week%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Audit%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22An%20outside%20review%20of%20the%20whole%20setup%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideRoadmap",
  "columns": [
    {
      "title": "Q1",
      "status": "Done",
      "items": [
        {
          "title": "Status page",
          "body": "Public, updated within five minutes"
        },
        {
          "title": "On-call rota",
          "body": "Two engineers, weekly handover"
        },
        {
          "title": "Paging",
          "body": "Alerts reach a phone, not an inbox"
        },
        {
          "title": "Runbooks",
          "body": "One per alert, linked from the page"
        }
      ]
    },
    {
      "title": "Q2",
      "status": "In progress",
      "current": true,
      "items": [
        {
          "title": "Error budgets",
          "body": "Each service owns a monthly budget"
        },
        {
          "title": "Load tests",
          "body": "Run nightly against a staging copy"
        },
        {
          "title": "Canary deploys",
          "body": "One percent of traffic goes first"
        },
        {
          "title": "Rollback",
          "body": "One command returns the last build"
        }
      ]
    },
    {
      "title": "Q3",
      "status": "Planned",
      "items": [
        {
          "title": "Chaos drills",
          "body": "A zone is switched off each month"
        },
        {
          "title": "Tracing",
          "body": "Every request carries one trace id"
        },
        {
          "title": "Cost review",
          "body": "Spend per service, every sprint"
        },
        {
          "title": "Game days",
          "body": "Rehearse the worst outage twice a year"
        }
      ]
    },
    {
      "title": "Q4",
      "status": "Proposed",
      "items": [
        {
          "title": "Second region",
          "body": "Serve reads if the first goes dark"
        },
        {
          "title": "Failover",
          "body": "Writes move over in under a minute"
        },
        {
          "title": "Backups",
          "body": "Restored and checked every week"
        },
        {
          "title": "Audit",
          "body": "An outside review of the whole setup"
        }
      ]
    }
  ]
}
```

:::

::::
