---
navigation_title: slideFanout
---

# `slideFanout`

Show one thing going to several destinations at once, and what each one does with it.

## Use when

- One event, request, or artifact reaches several consumers independently.
- Beside a slideTitle, to show what the subject feeds.

## Avoid when

- The steps happen in order; use slidePipeline.
- Several things connect to each other, not just to one source; use slideGraph.
- The destinations split by who owns them and ownership is the point; use slideTerritoryGroup.
- The points share no source; use slideBulletList.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideFanout example 1, light](images/slide-fanout-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideFanout example 1, dark](images/slide-fanout-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**OrderPlaced** →

- **picking**: Sends the list to the nearest store
- ○ **payments**: Holds the amount on the card
- **email**: Confirms the order to the customer
- **courier**: Books a delivery window
```

:::

:::{tab-item} Text
:sync: text

```text
OrderPlaced →
  picking: Sends the list to the nearest store
  ○ payments: Holds the amount on the card
  email: Confirms the order to the customer
  courier: Books a delivery window
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
            "text": "OrderPlaced",
            "style": {
              "bold": true
            }
          },
          {
            "type": "text",
            "text": " →"
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
                "text": "picking",
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
                "text": "Sends the list to the nearest store"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "○ "
              },
              {
                "type": "text",
                "text": "payments",
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
                "text": "Holds the amount on the card"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "email",
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
                "text": "Confirms the order to the customer"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "courier",
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
                "text": "Books a delivery window"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22OrderPlaced%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%86%92%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22picking%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Sends%20the%20list%20to%20the%20nearest%20store%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8B%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22payments%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Holds%20the%20amount%20on%20the%20card%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22email%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Confirms%20the%20order%20to%20the%20customer%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22courier%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Books%20a%20delivery%20window%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideFanout",
  "source": "OrderPlaced",
  "targets": [
    {
      "name": "picking",
      "body": "Sends the list to the nearest store"
    },
    {
      "name": "payments",
      "body": "Holds the amount on the card",
      "tone": "accent"
    },
    {
      "name": "email",
      "body": "Confirms the order to the customer"
    },
    {
      "name": "courier",
      "body": "Books a delivery window"
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

![slideFanout example 2, light](images/slide-fanout-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideFanout example 2, dark](images/slide-fanout-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**release tag** →

- **changelog**: Drafted from merged pull requests
- **registry**: Receives the signed build
```

:::

:::{tab-item} Text
:sync: text

```text
release tag →
  changelog: Drafted from merged pull requests
  registry: Receives the signed build
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
            "text": "release tag",
            "style": {
              "bold": true
            }
          },
          {
            "type": "text",
            "text": " →"
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
                "text": "changelog",
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
                "text": "Drafted from merged pull requests"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "registry",
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
                "text": "Receives the signed build"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22release%20tag%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%86%92%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22changelog%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Drafted%20from%20merged%20pull%20requests%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22registry%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Receives%20the%20signed%20build%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideFanout",
  "source": "release tag",
  "targets": [
    {
      "name": "changelog",
      "body": "Drafted from merged pull requests"
    },
    {
      "name": "registry",
      "body": "Receives the signed build"
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

![slideFanout example 3, light](images/slide-fanout-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideFanout example 3, dark](images/slide-fanout-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**incident** →

- **pager**: Wakes the on-call engineer
- **status page**: Posts a first notice
- **chat**: Opens a war room channel
- **timeline**: Starts recording events
- **support**: Tags incoming tickets
- **review**: Schedules the retrospective
```

:::

:::{tab-item} Text
:sync: text

```text
incident →
  pager: Wakes the on-call engineer
  status page: Posts a first notice
  chat: Opens a war room channel
  timeline: Starts recording events
  support: Tags incoming tickets
  review: Schedules the retrospective
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
            "text": "incident",
            "style": {
              "bold": true
            }
          },
          {
            "type": "text",
            "text": " →"
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
                "text": "pager",
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
                "text": "Wakes the on-call engineer"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "status page",
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
                "text": "Posts a first notice"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "chat",
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
                "text": "Opens a war room channel"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "timeline",
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
                "text": "Starts recording events"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "support",
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
                "text": "Tags incoming tickets"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "review",
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
                "text": "Schedules the retrospective"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22incident%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%86%92%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22pager%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Wakes%20the%20on-call%20engineer%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22status%20page%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Posts%20a%20first%20notice%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22chat%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Opens%20a%20war%20room%20channel%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22timeline%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Starts%20recording%20events%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22support%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Tags%20incoming%20tickets%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22review%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Schedules%20the%20retrospective%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideFanout",
  "source": "incident",
  "targets": [
    {
      "name": "pager",
      "body": "Wakes the on-call engineer"
    },
    {
      "name": "status page",
      "body": "Posts a first notice"
    },
    {
      "name": "chat",
      "body": "Opens a war room channel"
    },
    {
      "name": "timeline",
      "body": "Starts recording events"
    },
    {
      "name": "support",
      "body": "Tags incoming tickets"
    },
    {
      "name": "review",
      "body": "Schedules the retrospective"
    }
  ]
}
```

:::

::::
