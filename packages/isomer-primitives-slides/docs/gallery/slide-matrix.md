---
navigation_title: slideMatrix
---

# `slideMatrix`

Let the audience see at a glance which options support which capabilities, and where support is only partial.

## Use when

- Several options are compared on the same capabilities, and each answer is yes, partly, or no.
- The gaps matter more than the details: the audience should spot the empty cells first.
- One option is the recommendation: set `highlight` to its column so it stands out.

## Avoid when

- The cells hold numbers or short phrases rather than yes, partly, or no; use slideTable.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideMatrix example 1, light](images/slide-matrix-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideMatrix example 1, dark](images/slide-matrix-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
| | Card | Wallet | Bank | Invoice |
| - | - | - | - | - |
| Instant capture | Yes | Yes | No | No |
| Partial refunds | Yes | Partial | Yes | No |
| Recurring | Yes | Partial | Yes | Yes |
| Disputes | Yes | Yes | Partial | No |
```

:::

:::{tab-item} Text
:sync: text

```text
                 Card  Wallet   Bank     Invoice
---------------  ----  -------  -------  -------
Instant capture  Yes   Yes      No       No
Partial refunds  Yes   Partial  Yes      No
Recurring        Yes   Partial  Yes      Yes
Disputes         Yes   Yes      Partial  No
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "table",
    "rows": [
      [
        {
          "type": "raw_text",
          "text": ""
        },
        {
          "type": "raw_text",
          "text": "Card"
        },
        {
          "type": "raw_text",
          "text": "Wallet"
        },
        {
          "type": "raw_text",
          "text": "Bank"
        },
        {
          "type": "raw_text",
          "text": "Invoice"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Instant capture"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "No"
        },
        {
          "type": "raw_text",
          "text": "No"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Partial refunds"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Partial"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "No"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Recurring"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Partial"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Disputes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Partial"
        },
        {
          "type": "raw_text",
          "text": "No"
        }
      ]
    ],
    "column_settings": [
      {
        "is_wrapped": true
      },
      {
        "is_wrapped": true
      },
      {
        "is_wrapped": true
      },
      {
        "is_wrapped": true
      },
      {
        "is_wrapped": true
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22table%22%2C%22rows%22%3A%5B%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Card%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Wallet%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Bank%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Invoice%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Instant%20capture%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Partial%20refunds%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Partial%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Recurring%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Partial%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Disputes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Partial%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%5D%5D%2C%22column_settings%22%3A%5B%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideMatrix",
  "columns": [
    "Card",
    "Wallet",
    "Bank",
    "Invoice"
  ],
  "legend": true,
  "rows": [
    {
      "label": "Instant capture",
      "marks": [
        "full",
        "full",
        "none",
        "none"
      ]
    },
    {
      "label": "Partial refunds",
      "marks": [
        "full",
        "partial",
        "full",
        "none"
      ]
    },
    {
      "label": "Recurring",
      "marks": [
        "full",
        "partial",
        "full",
        "full"
      ]
    },
    {
      "label": "Disputes",
      "marks": [
        "full",
        "full",
        "partial",
        "none"
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

![slideMatrix example 2, light](images/slide-matrix-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideMatrix example 2, dark](images/slide-matrix-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
| | iOS | Android | Web | Watch | TV | Car |
| - | - | - | - | - | - | - |
| Offline maps | Yes | Yes | No | Partial | No | Yes |
| Voice search | Yes | Yes | Partial | Yes | Yes | Yes |
| Live traffic | Yes | Yes | Yes | Partial | No | Yes |
| Saved places | Yes | Yes | Yes | Yes | Partial | Partial |
| Transit | Yes | Yes | Yes | No | No | No |
| Street view | Yes | Partial | Yes | No | Yes | No |
| Sharing | Yes | Yes | Yes | Partial | No | Partial |
| Dark mode | Yes | Yes | Partial | Yes | Yes | Yes |
```

:::

:::{tab-item} Text
:sync: text

```text
              iOS  Android  Web      Watch    TV       Car
------------  ---  -------  -------  -------  -------  -------
Offline maps  Yes  Yes      No       Partial  No       Yes
Voice search  Yes  Yes      Partial  Yes      Yes      Yes
Live traffic  Yes  Yes      Yes      Partial  No       Yes
Saved places  Yes  Yes      Yes      Yes      Partial  Partial
Transit       Yes  Yes      Yes      No       No       No
Street view   Yes  Partial  Yes      No       Yes      No
Sharing       Yes  Yes      Yes      Partial  No       Partial
Dark mode     Yes  Yes      Partial  Yes      Yes      Yes
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "table",
    "rows": [
      [
        {
          "type": "raw_text",
          "text": ""
        },
        {
          "type": "raw_text",
          "text": "iOS"
        },
        {
          "type": "raw_text",
          "text": "Android"
        },
        {
          "type": "raw_text",
          "text": "Web"
        },
        {
          "type": "raw_text",
          "text": "Watch"
        },
        {
          "type": "raw_text",
          "text": "TV"
        },
        {
          "type": "raw_text",
          "text": "Car"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Offline maps"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "No"
        },
        {
          "type": "raw_text",
          "text": "Partial"
        },
        {
          "type": "raw_text",
          "text": "No"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Voice search"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Partial"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Live traffic"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Partial"
        },
        {
          "type": "raw_text",
          "text": "No"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Saved places"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Partial"
        },
        {
          "type": "raw_text",
          "text": "Partial"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Transit"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "No"
        },
        {
          "type": "raw_text",
          "text": "No"
        },
        {
          "type": "raw_text",
          "text": "No"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Street view"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Partial"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "No"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "No"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Sharing"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Partial"
        },
        {
          "type": "raw_text",
          "text": "No"
        },
        {
          "type": "raw_text",
          "text": "Partial"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Dark mode"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Partial"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        }
      ]
    ],
    "column_settings": [
      {
        "is_wrapped": true
      },
      {
        "is_wrapped": true
      },
      {
        "is_wrapped": true
      },
      {
        "is_wrapped": true
      },
      {
        "is_wrapped": true
      },
      {
        "is_wrapped": true
      },
      {
        "is_wrapped": true
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22table%22%2C%22rows%22%3A%5B%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22iOS%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Android%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Web%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Watch%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22TV%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Car%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Offline%20maps%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Partial%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Voice%20search%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Partial%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Live%20traffic%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Partial%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Saved%20places%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Partial%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Partial%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Transit%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Street%20view%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Partial%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Sharing%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Partial%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Partial%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Dark%20mode%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Partial%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%5D%5D%2C%22column_settings%22%3A%5B%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideMatrix",
  "columns": [
    "iOS",
    "Android",
    "Web",
    "Watch",
    "TV",
    "Car"
  ],
  "legend": true,
  "rows": [
    {
      "label": "Offline maps",
      "marks": [
        "full",
        "full",
        "none",
        "partial",
        "none",
        "full"
      ]
    },
    {
      "label": "Voice search",
      "marks": [
        "full",
        "full",
        "partial",
        "full",
        "full",
        "full"
      ]
    },
    {
      "label": "Live traffic",
      "marks": [
        "full",
        "full",
        "full",
        "partial",
        "none",
        "full"
      ]
    },
    {
      "label": "Saved places",
      "marks": [
        "full",
        "full",
        "full",
        "full",
        "partial",
        "partial"
      ]
    },
    {
      "label": "Transit",
      "marks": [
        "full",
        "full",
        "full",
        "none",
        "none",
        "none"
      ]
    },
    {
      "label": "Street view",
      "marks": [
        "full",
        "partial",
        "full",
        "none",
        "full",
        "none"
      ]
    },
    {
      "label": "Sharing",
      "marks": [
        "full",
        "full",
        "full",
        "partial",
        "none",
        "partial"
      ]
    },
    {
      "label": "Dark mode",
      "marks": [
        "full",
        "full",
        "partial",
        "full",
        "full",
        "full"
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

![slideMatrix example 3, light](images/slide-matrix-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideMatrix example 3, dark](images/slide-matrix-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
| | Basic | **● Plus** |
| - | - | - |
| Free delivery | No | Yes |
| Order tracking | Yes | Yes |
| Priority slots | No | Yes |
```

:::

:::{tab-item} Text
:sync: text

```text
                Basic  ● Plus
--------------  -----  ------
Free delivery   No     Yes
Order tracking  Yes    Yes
Priority slots  No     Yes
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "table",
    "rows": [
      [
        {
          "type": "raw_text",
          "text": ""
        },
        {
          "type": "raw_text",
          "text": "Basic"
        },
        {
          "type": "rich_text",
          "elements": [
            {
              "type": "rich_text_section",
              "elements": [
                {
                  "type": "text",
                  "text": "● Plus",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Free delivery"
        },
        {
          "type": "raw_text",
          "text": "No"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Order tracking"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Priority slots"
        },
        {
          "type": "raw_text",
          "text": "No"
        },
        {
          "type": "raw_text",
          "text": "Yes"
        }
      ]
    ],
    "column_settings": [
      {
        "is_wrapped": true
      },
      {
        "is_wrapped": true
      },
      {
        "is_wrapped": true
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22table%22%2C%22rows%22%3A%5B%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Basic%22%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20Plus%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Free%20delivery%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Order%20tracking%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Priority%20slots%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22No%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Yes%22%7D%5D%5D%2C%22column_settings%22%3A%5B%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideMatrix",
  "columns": [
    "Basic",
    "Plus"
  ],
  "highlight": 1,
  "legend": false,
  "rows": [
    {
      "label": "Free delivery",
      "marks": [
        "none",
        "full"
      ]
    },
    {
      "label": "Order tracking",
      "marks": [
        "full",
        "full"
      ]
    },
    {
      "label": "Priority slots",
      "marks": [
        "none",
        "full"
      ]
    }
  ]
}
```

:::

::::
