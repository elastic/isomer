---
navigation_title: slideAgenda
---

# `slideAgenda`

Show the audience every part of the talk and which one they are in, so they know how far along it is.

## Use when

- Opening a talk with its outline, before the first section starts.
- Returning to the outline between sections, with the section about to start marked current.

## Avoid when

- The slide opens one section and lists what that section covers; use slideSection.
- The rows are dated events or stages of work; use slideTimeline or slideRoadmap.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideAgenda example 1, light](images/slide-agenda-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideAgenda example 1, dark](images/slide-agenda-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- **01** Why returns cost us · 3 slides
- **02** What customers told us · 4 slides
- **03** The new returns flow · YOU ARE HERE
- **04** Rolling it out · 3 slides
- **05** Questions · 2 slides
```

:::

:::{tab-item} Text
:sync: text

```text
01 Why returns cost us · 3 slides
02 What customers told us · 4 slides
03 The new returns flow · YOU ARE HERE
04 Rolling it out · 3 slides
05 Questions · 2 slides
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
                "text": "01",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " Why returns cost us · 3 slides"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "02",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " What customers told us · 4 slides"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "03",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " The new returns flow · YOU ARE HERE"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "04",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " Rolling it out · 3 slides"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "05",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " Questions · 2 slides"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2201%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20Why%20returns%20cost%20us%20%C2%B7%203%20slides%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2202%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20What%20customers%20told%20us%20%C2%B7%204%20slides%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2203%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20The%20new%20returns%20flow%20%C2%B7%20YOU%20ARE%20HERE%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2204%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20Rolling%20it%20out%20%C2%B7%203%20slides%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2205%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20Questions%20%C2%B7%202%20slides%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideAgenda",
  "sections": [
    {
      "number": "01",
      "title": "Why returns cost us",
      "count": "3 slides"
    },
    {
      "number": "02",
      "title": "What customers told us",
      "count": "4 slides"
    },
    {
      "number": "03",
      "title": "The new returns flow",
      "current": true
    },
    {
      "number": "04",
      "title": "Rolling it out",
      "count": "3 slides"
    },
    {
      "number": "05",
      "title": "Questions",
      "count": "2 slides"
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

![slideAgenda example 2, light](images/slide-agenda-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideAgenda example 2, dark](images/slide-agenda-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- **1** Where the budget went
- **2** What we cut
- **3** What we keep
```

:::

:::{tab-item} Text
:sync: text

```text
1 Where the budget went
2 What we cut
3 What we keep
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
                "text": "1",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " Where the budget went"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "2",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " What we cut"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "3",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " What we keep"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%221%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20Where%20the%20budget%20went%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%222%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20What%20we%20cut%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%223%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20What%20we%20keep%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideAgenda",
  "sections": [
    {
      "number": "1",
      "title": "Where the budget went"
    },
    {
      "number": "2",
      "title": "What we cut"
    },
    {
      "number": "3",
      "title": "What we keep"
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

![slideAgenda example 3, light](images/slide-agenda-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideAgenda example 3, dark](images/slide-agenda-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
- **01** The incident · 2 slides
- **02** Timeline · 3 slides
- **03** Root cause · 4 slides
- **04** Why tests missed it · 2 slides
- **05** What we changed · 3 slides
- **06** What we still owe · YOU ARE HERE
- **07** Lessons · 2 slides
- **08** Questions · 1 slide
```

:::

:::{tab-item} Text
:sync: text

```text
01 The incident · 2 slides
02 Timeline · 3 slides
03 Root cause · 4 slides
04 Why tests missed it · 2 slides
05 What we changed · 3 slides
06 What we still owe · YOU ARE HERE
07 Lessons · 2 slides
08 Questions · 1 slide
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
                "text": "01",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " The incident · 2 slides"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "02",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " Timeline · 3 slides"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "03",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " Root cause · 4 slides"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "04",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " Why tests missed it · 2 slides"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "05",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " What we changed · 3 slides"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "06",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " What we still owe · YOU ARE HERE"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "07",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " Lessons · 2 slides"
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "08",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " Questions · 1 slide"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2201%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20The%20incident%20%C2%B7%202%20slides%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2202%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20Timeline%20%C2%B7%203%20slides%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2203%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20Root%20cause%20%C2%B7%204%20slides%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2204%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20Why%20tests%20missed%20it%20%C2%B7%202%20slides%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2205%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20What%20we%20changed%20%C2%B7%203%20slides%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2206%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20What%20we%20still%20owe%20%C2%B7%20YOU%20ARE%20HERE%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2207%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20Lessons%20%C2%B7%202%20slides%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2208%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20Questions%20%C2%B7%201%20slide%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideAgenda",
  "sections": [
    {
      "number": "01",
      "title": "The incident",
      "count": "2 slides"
    },
    {
      "number": "02",
      "title": "Timeline",
      "count": "3 slides"
    },
    {
      "number": "03",
      "title": "Root cause",
      "count": "4 slides"
    },
    {
      "number": "04",
      "title": "Why tests missed it",
      "count": "2 slides"
    },
    {
      "number": "05",
      "title": "What we changed",
      "count": "3 slides"
    },
    {
      "number": "06",
      "title": "What we still owe",
      "current": true
    },
    {
      "number": "07",
      "title": "Lessons",
      "count": "2 slides"
    },
    {
      "number": "08",
      "title": "Questions",
      "count": "1 slide"
    }
  ]
}
```

:::

::::
