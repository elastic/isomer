---
navigation_title: slideTimeline
---

# `slideTimeline`

Show how a need or situation changed over dated points, leading up to the one that matters now.

## Use when

- The argument is a history: each point in time asked for or tried something, and the latest is where the story lands.
- You have 3–5 dated moments that each deserve a quoted ask and a one-line outcome.

## Avoid when

- The points are plans ahead, grouped by horizon rather than dated events; use slideRoadmap.
- The items have no order and no dates; use slideBulletList.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideTimeline example 1, light](images/slide-timeline-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTimeline example 1, dark](images/slide-timeline-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- **2019 · PHONE.** “Can I order by calling the store?” Staff took orders by hand and keyed them in after close.
- **2021 · WEB.** “Let me build a basket online.” The site worked, but substitutions still needed a phone call.
- **2023 · APP.** “Tell me when my driver is close.” Live tracking shipped; the substitution flow stayed **on the web**.
- **● 2025 · CHAT.** “Just swap the oat milk if it is out.” Customers now approve substitutions in a message, not a form.
```

:::

:::{tab-item} Text
:sync: text

```text
2019 · PHONE. “Can I order by calling the store?” Staff took orders by hand and keyed them in after close.
2021 · WEB. “Let me build a basket online.” The site worked, but substitutions still needed a phone call.
2023 · APP. “Tell me when my driver is close.” Live tracking shipped; the substitution flow stayed on the web.
● 2025 · CHAT. “Just swap the oat milk if it is out.” Customers now approve substitutions in a message, not a form.
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
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "2019 · PHONE.",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " “"
              },
              {
                "type": "text",
                "text": "Can I order by calling the store?"
              },
              {
                "type": "text",
                "text": "” "
              },
              {
                "type": "text",
                "text": "Staff took orders by hand and keyed them in after close."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "2021 · WEB.",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " “"
              },
              {
                "type": "text",
                "text": "Let me build a basket online."
              },
              {
                "type": "text",
                "text": "” "
              },
              {
                "type": "text",
                "text": "The site worked, but substitutions still needed a phone call."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "2023 · APP.",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " “"
              },
              {
                "type": "text",
                "text": "Tell me when my driver is close."
              },
              {
                "type": "text",
                "text": "” "
              },
              {
                "type": "text",
                "text": "Live tracking shipped; the substitution flow stayed "
              },
              {
                "type": "text",
                "text": "on the web",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": "."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "● 2025 · CHAT.",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " “"
              },
              {
                "type": "text",
                "text": "Just swap the oat milk if it is out."
              },
              {
                "type": "text",
                "text": "” "
              },
              {
                "type": "text",
                "text": "Customers now approve substitutions in a message, not a form."
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%222019%20%C2%B7%20PHONE.%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%9C%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Can%20I%20order%20by%20calling%20the%20store%3F%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%80%9D%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Staff%20took%20orders%20by%20hand%20and%20keyed%20them%20in%20after%20close.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%222021%20%C2%B7%20WEB.%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%9C%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Let%20me%20build%20a%20basket%20online.%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%80%9D%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20site%20worked%2C%20but%20substitutions%20still%20needed%20a%20phone%20call.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%222023%20%C2%B7%20APP.%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%9C%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Tell%20me%20when%20my%20driver%20is%20close.%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%80%9D%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Live%20tracking%20shipped%3B%20the%20substitution%20flow%20stayed%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22on%20the%20web%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%202025%20%C2%B7%20CHAT.%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%9C%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Just%20swap%20the%20oat%20milk%20if%20it%20is%20out.%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%80%9D%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Customers%20now%20approve%20substitutions%20in%20a%20message%2C%20not%20a%20form.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTimeline",
  "items": [
    {
      "label": "2019",
      "channel": "Phone",
      "heading": "Can I order by calling the store?",
      "body": "Staff took orders by hand and keyed them in after close."
    },
    {
      "label": "2021",
      "channel": "Web",
      "heading": "Let me build a basket online.",
      "body": "The site worked, but substitutions still needed a phone call."
    },
    {
      "label": "2023",
      "channel": "App",
      "heading": "Tell me when my driver is close.",
      "body": "Live tracking shipped; the substitution flow stayed **on the web**."
    },
    {
      "label": "2025",
      "channel": "Chat",
      "heading": "Just swap the oat milk if it is out.",
      "body": "Customers now approve substitutions in a message, not a form.",
      "current": true
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

![slideTimeline example 2, light](images/slide-timeline-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTimeline example 2, dark](images/slide-timeline-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- **Q1 · PILOT.** “Can two stores share one picker queue?” Pick times fell by a fifth in the pilot stores.
- **Q2 · REGION.** “Roll it out across the north.” Twelve stores moved over in six weeks.
- **Q3 · NATIONAL.** “Make it the `default` everywhere.” The old queue was switched off in September.
```

:::

:::{tab-item} Text
:sync: text

```text
Q1 · PILOT. “Can two stores share one picker queue?” Pick times fell by a fifth in the pilot stores.
Q2 · REGION. “Roll it out across the north.” Twelve stores moved over in six weeks.
Q3 · NATIONAL. “Make it the default everywhere.” The old queue was switched off in September.
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
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Q1 · PILOT.",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " “"
              },
              {
                "type": "text",
                "text": "Can two stores share one picker queue?"
              },
              {
                "type": "text",
                "text": "” "
              },
              {
                "type": "text",
                "text": "Pick times fell by a fifth in the pilot stores."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Q2 · REGION.",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " “"
              },
              {
                "type": "text",
                "text": "Roll it out across the north."
              },
              {
                "type": "text",
                "text": "” "
              },
              {
                "type": "text",
                "text": "Twelve stores moved over in six weeks."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Q3 · NATIONAL.",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " “"
              },
              {
                "type": "text",
                "text": "Make it the "
              },
              {
                "type": "text",
                "text": "default",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": " everywhere."
              },
              {
                "type": "text",
                "text": "” "
              },
              {
                "type": "text",
                "text": "The old queue was switched off in September."
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Q1%20%C2%B7%20PILOT.%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%9C%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Can%20two%20stores%20share%20one%20picker%20queue%3F%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%80%9D%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Pick%20times%20fell%20by%20a%20fifth%20in%20the%20pilot%20stores.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Q2%20%C2%B7%20REGION.%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%9C%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Roll%20it%20out%20across%20the%20north.%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%80%9D%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Twelve%20stores%20moved%20over%20in%20six%20weeks.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Q3%20%C2%B7%20NATIONAL.%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%9C%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Make%20it%20the%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22default%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20everywhere.%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%80%9D%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20old%20queue%20was%20switched%20off%20in%20September.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTimeline",
  "items": [
    {
      "label": "Q1",
      "channel": "Pilot",
      "heading": "Can two stores share one picker queue?",
      "body": "Pick times fell by a fifth in the pilot stores."
    },
    {
      "label": "Q2",
      "channel": "Region",
      "heading": "Roll it out across the north.",
      "body": "Twelve stores moved over in six weeks."
    },
    {
      "label": "Q3",
      "channel": "National",
      "heading": "Make it the `default` everywhere.",
      "body": "The old queue was switched off in September."
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

![slideTimeline example 3, light](images/slide-timeline-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTimeline example 3, dark](images/slide-timeline-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- **Mon · DETECT.** “Checkout latency doubled.” An alert fired at 09:12.
- **Tue · TRIAGE.** “It only hits saved cards.” The token service was retrying twice.
- **● Wed · FIX.** “Drop the second retry.” Latency returned to baseline by noon.
- **Thu · REVIEW.** “Why did no test catch it?” Load tests used fresh cards only.
- **Fri · FOLLOW-UP.** “Add saved cards to the load mix.” The suite now covers both paths.
```

:::

:::{tab-item} Text
:sync: text

```text
Mon · DETECT. “Checkout latency doubled.” An alert fired at 09:12.
Tue · TRIAGE. “It only hits saved cards.” The token service was retrying twice.
● Wed · FIX. “Drop the second retry.” Latency returned to baseline by noon.
Thu · REVIEW. “Why did no test catch it?” Load tests used fresh cards only.
Fri · FOLLOW-UP. “Add saved cards to the load mix.” The suite now covers both paths.
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
        "style": "bullet",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Mon · DETECT.",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " “"
              },
              {
                "type": "text",
                "text": "Checkout latency doubled."
              },
              {
                "type": "text",
                "text": "” "
              },
              {
                "type": "text",
                "text": "An alert fired at 09:12."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Tue · TRIAGE.",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " “"
              },
              {
                "type": "text",
                "text": "It only hits saved cards."
              },
              {
                "type": "text",
                "text": "” "
              },
              {
                "type": "text",
                "text": "The token service was retrying twice."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "● Wed · FIX.",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " “"
              },
              {
                "type": "text",
                "text": "Drop the second retry."
              },
              {
                "type": "text",
                "text": "” "
              },
              {
                "type": "text",
                "text": "Latency returned to baseline by noon."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Thu · REVIEW.",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " “"
              },
              {
                "type": "text",
                "text": "Why did no test catch it?"
              },
              {
                "type": "text",
                "text": "” "
              },
              {
                "type": "text",
                "text": "Load tests used fresh cards only."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Fri · FOLLOW-UP.",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " “"
              },
              {
                "type": "text",
                "text": "Add saved cards to the load mix."
              },
              {
                "type": "text",
                "text": "” "
              },
              {
                "type": "text",
                "text": "The suite now covers both paths."
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Mon%20%C2%B7%20DETECT.%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%9C%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Checkout%20latency%20doubled.%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%80%9D%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22An%20alert%20fired%20at%2009%3A12.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Tue%20%C2%B7%20TRIAGE.%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%9C%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22It%20only%20hits%20saved%20cards.%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%80%9D%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20token%20service%20was%20retrying%20twice.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20Wed%20%C2%B7%20FIX.%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%9C%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Drop%20the%20second%20retry.%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%80%9D%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Latency%20returned%20to%20baseline%20by%20noon.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Thu%20%C2%B7%20REVIEW.%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%9C%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Why%20did%20no%20test%20catch%20it%3F%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%80%9D%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Load%20tests%20used%20fresh%20cards%20only.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Fri%20%C2%B7%20FOLLOW-UP.%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%9C%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Add%20saved%20cards%20to%20the%20load%20mix.%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%80%9D%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20suite%20now%20covers%20both%20paths.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTimeline",
  "items": [
    {
      "label": "Mon",
      "channel": "Detect",
      "heading": "Checkout latency doubled.",
      "body": "An alert fired at 09:12."
    },
    {
      "label": "Tue",
      "channel": "Triage",
      "heading": "It only hits saved cards.",
      "body": "The token service was retrying twice."
    },
    {
      "label": "Wed",
      "channel": "Fix",
      "heading": "Drop the second retry.",
      "body": "Latency returned to baseline by noon.",
      "current": true
    },
    {
      "label": "Thu",
      "channel": "Review",
      "heading": "Why did no test catch it?",
      "body": "Load tests used fresh cards only."
    },
    {
      "label": "Fri",
      "channel": "Follow-up",
      "heading": "Add saved cards to the load mix.",
      "body": "The suite now covers both paths."
    }
  ]
}
```

:::

::::
