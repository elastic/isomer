---
navigation_title: slideClosing
---

# `slideClosing`

Send the audience away knowing where to go next: a few addresses, and what to read first for each goal.

## Use when

- Ending a deck; it is the only node in an inverse frame.
- The audience will want links to docs, source, or a contact after the talk.

## Avoid when

- The deck is starting; use slideTitle.
- A section is starting; use slideSection.
- The slide makes a claim mid-deck; use slideHeading in a page frame.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideClosing example 1, light](images/slide-closing-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideClosing example 1, dark](images/slide-closing-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# Start here

**DOCS** · [example.com/ledger/docs](https://example.com/ledger/docs)

**RUNBOOK** · [example.com/ledger/runbook](https://example.com/ledger/runbook)

- **Issue a refund**: The refunds guide, then `POST /refunds`
- **Reconcile a day**: The settlement report and its columns
- **Handle a dispute**: The chargeback flow and its deadlines
- **Go on call**: The runbook and the escalation list
```

:::

:::{tab-item} Text
:sync: text

```text
START HERE

DOCS · example.com/ledger/docs
RUNBOOK · example.com/ledger/runbook

- Issue a refund: The refunds guide, then POST /refunds
- Reconcile a day: The settlement report and its columns
- Handle a dispute: The chargeback flow and its deadlines
- Go on call: The runbook and the escalation list
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
      "text": "Start here",
      "emoji": true
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*DOCS* · <https://example.com/ledger/docs|example.com/ledger/docs>\n*RUNBOOK* · <https://example.com/ledger/runbook|example.com/ledger/runbook>"
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
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Issue a refund",
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
                "text": "The refunds guide, then "
              },
              {
                "type": "text",
                "text": "POST /refunds",
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
                "text": "Reconcile a day",
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
                "text": "The settlement report and its columns"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Handle a dispute",
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
                "text": "The chargeback flow and its deadlines"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Go on call",
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
                "text": "The runbook and the escalation list"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%22Start%20here%22%2C%22emoji%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*DOCS*%20%C2%B7%20%3Chttps%3A%2F%2Fexample.com%2Fledger%2Fdocs%7Cexample.com%2Fledger%2Fdocs%3E%5Cn*RUNBOOK*%20%C2%B7%20%3Chttps%3A%2F%2Fexample.com%2Fledger%2Frunbook%7Cexample.com%2Fledger%2Frunbook%3E%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Issue%20a%20refund%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20refunds%20guide%2C%20then%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22POST%20%2Frefunds%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Reconcile%20a%20day%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20settlement%20report%20and%20its%20columns%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Handle%20a%20dispute%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20chargeback%20flow%20and%20its%20deadlines%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Go%20on%20call%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20runbook%20and%20the%20escalation%20list%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideClosing",
  "title": "Start here",
  "links": [
    {
      "label": "Docs",
      "href": "https://example.com/ledger/docs",
      "text": "example.com/ledger/docs"
    },
    {
      "label": "Runbook",
      "href": "https://example.com/ledger/runbook",
      "text": "example.com/ledger/runbook"
    }
  ],
  "paths": [
    {
      "title": "Issue a refund",
      "body": "The refunds guide, then `POST /refunds`"
    },
    {
      "title": "Reconcile a day",
      "body": "The settlement report and its columns"
    },
    {
      "title": "Handle a dispute",
      "body": "The chargeback flow and its deadlines"
    },
    {
      "title": "Go on call",
      "body": "The runbook and the escalation list"
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

![slideClosing example 2, light](images/slide-closing-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideClosing example 2, dark](images/slide-closing-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# Thank you

**QUESTIONS** · <payments@example.com>
```

:::

:::{tab-item} Text
:sync: text

```text
THANK YOU

QUESTIONS · payments@example.com
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
      "text": "Thank you",
      "emoji": true
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*QUESTIONS* · <mailto:payments@example.com|payments@example.com>"
    }
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%22Thank%20you%22%2C%22emoji%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*QUESTIONS*%20%C2%B7%20%3Cmailto%3Apayments%40example.com%7Cpayments%40example.com%3E%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideClosing",
  "title": "Thank you",
  "links": [
    {
      "label": "Questions",
      "href": "mailto:payments@example.com",
      "text": "payments@example.com"
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

![slideClosing example 3, light](images/slide-closing-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideClosing example 3, dark](images/slide-closing-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
# Keep going

**DOCS** · [example.com/docs](https://example.com/docs)

**SOURCE** · [example.com/src](https://example.com/src)

**CHAT** · [example.com/chat](https://example.com/chat)

**ROADMAP** · [Roadmap](/roadmap)

- **Place an order**: The quick start and the cart API
- **Add a store**: Store onboarding and its stock feed
- **Plan a route**: Courier windows and how they fill
- **Price a basket**: Promotions, taxes, and rounding
- **Read the numbers**: The weekly dashboard, explained
```

:::

:::{tab-item} Text
:sync: text

```text
KEEP GOING

DOCS · example.com/docs
SOURCE · example.com/src
CHAT · example.com/chat
ROADMAP · Roadmap (/roadmap)

- Place an order: The quick start and the cart API
- Add a store: Store onboarding and its stock feed
- Plan a route: Courier windows and how they fill
- Price a basket: Promotions, taxes, and rounding
- Read the numbers: The weekly dashboard, explained
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
      "text": "Keep going",
      "emoji": true
    }
  },
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*DOCS* · <https://example.com/docs|example.com/docs>\n*SOURCE* · <https://example.com/src|example.com/src>\n*CHAT* · <https://example.com/chat|example.com/chat>\n*ROADMAP* · Roadmap"
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
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_list",
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Place an order",
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
                "text": "The quick start and the cart API"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Add a store",
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
                "text": "Store onboarding and its stock feed"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Plan a route",
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
                "text": "Courier windows and how they fill"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Price a basket",
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
                "text": "Promotions, taxes, and rounding"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Read the numbers",
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
                "text": "The weekly dashboard, explained"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22header%22%2C%22text%22%3A%7B%22type%22%3A%22plain_text%22%2C%22text%22%3A%22Keep%20going%22%2C%22emoji%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*DOCS*%20%C2%B7%20%3Chttps%3A%2F%2Fexample.com%2Fdocs%7Cexample.com%2Fdocs%3E%5Cn*SOURCE*%20%C2%B7%20%3Chttps%3A%2F%2Fexample.com%2Fsrc%7Cexample.com%2Fsrc%3E%5Cn*CHAT*%20%C2%B7%20%3Chttps%3A%2F%2Fexample.com%2Fchat%7Cexample.com%2Fchat%3E%5Cn*ROADMAP*%20%C2%B7%20Roadmap%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Place%20an%20order%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20quick%20start%20and%20the%20cart%20API%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Add%20a%20store%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Store%20onboarding%20and%20its%20stock%20feed%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Plan%20a%20route%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Courier%20windows%20and%20how%20they%20fill%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Price%20a%20basket%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Promotions%2C%20taxes%2C%20and%20rounding%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Read%20the%20numbers%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20weekly%20dashboard%2C%20explained%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideClosing",
  "title": "Keep going",
  "links": [
    {
      "label": "Docs",
      "href": "https://example.com/docs",
      "text": "example.com/docs"
    },
    {
      "label": "Source",
      "href": "https://example.com/src",
      "text": "example.com/src"
    },
    {
      "label": "Chat",
      "href": "https://example.com/chat",
      "text": "example.com/chat"
    },
    {
      "label": "Roadmap",
      "href": "/roadmap",
      "text": "Roadmap"
    }
  ],
  "paths": [
    {
      "title": "Place an order",
      "body": "The quick start and the cart API"
    },
    {
      "title": "Add a store",
      "body": "Store onboarding and its stock feed"
    },
    {
      "title": "Plan a route",
      "body": "Courier windows and how they fill"
    },
    {
      "title": "Price a basket",
      "body": "Promotions, taxes, and rounding"
    },
    {
      "title": "Read the numbers",
      "body": "The weekly dashboard, explained"
    }
  ]
}
```

:::

::::
