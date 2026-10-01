---
navigation_title: slideBars
---

# `slideBars`

Let the audience compare the size of several amounts of the same kind, and see which one stands out.

## Use when

- Two to six amounts in one unit should be ranked or compared by size, such as orders per site.
- One item is the point of the slide and should stand out from the rest; set `highlight` on it.

## Avoid when

- There are two to four numbers to remember rather than compare; use slideStats.
- One number changed from before to after; use slideDelta.
- Each item has several attributes, not one amount; use slideTable.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideBars example 1, light](images/slide-bars-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideBars example 1, dark](images/slide-bars-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
| Label | Value | Detail |
| - | - | - |
| Leeds | 412 | orders packed per hour |
| **● Bristol** | **356** | **orders packed per hour** |
| Glasgow | 298 | orders packed per hour |
| Cardiff | 214 | orders packed per hour |
| Belfast | 130 | opened in March |
```

:::

:::{tab-item} Text
:sync: text

```text
Label      Value  Detail
---------  -----  ----------------------
Leeds      412    orders packed per hour
● Bristol  356    orders packed per hour
Glasgow    298    orders packed per hour
Cardiff    214    orders packed per hour
Belfast    130    opened in March
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
          "text": "Label"
        },
        {
          "type": "raw_text",
          "text": "Value"
        },
        {
          "type": "raw_text",
          "text": "Detail"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Leeds"
        },
        {
          "type": "raw_text",
          "text": "412"
        },
        {
          "type": "raw_text",
          "text": "orders packed per hour"
        }
      ],
      [
        {
          "type": "rich_text",
          "elements": [
            {
              "type": "rich_text_section",
              "elements": [
                {
                  "type": "text",
                  "text": "● Bristol",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "rich_text",
          "elements": [
            {
              "type": "rich_text_section",
              "elements": [
                {
                  "type": "text",
                  "text": "356",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "rich_text",
          "elements": [
            {
              "type": "rich_text_section",
              "elements": [
                {
                  "type": "text",
                  "text": "orders packed per hour",
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
          "text": "Glasgow"
        },
        {
          "type": "raw_text",
          "text": "298"
        },
        {
          "type": "raw_text",
          "text": "orders packed per hour"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Cardiff"
        },
        {
          "type": "raw_text",
          "text": "214"
        },
        {
          "type": "raw_text",
          "text": "orders packed per hour"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Belfast"
        },
        {
          "type": "raw_text",
          "text": "130"
        },
        {
          "type": "raw_text",
          "text": "opened in March"
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

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22table%22%2C%22rows%22%3A%5B%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Label%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Value%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Detail%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Leeds%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22412%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22orders%20packed%20per%20hour%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20Bristol%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22356%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22orders%20packed%20per%20hour%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Glasgow%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22298%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22orders%20packed%20per%20hour%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Cardiff%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22214%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22orders%20packed%20per%20hour%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Belfast%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22130%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22opened%20in%20March%22%7D%5D%5D%2C%22column_settings%22%3A%5B%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideBars",
  "items": [
    {
      "label": "Leeds",
      "value": 412,
      "detail": "orders packed per hour"
    },
    {
      "label": "Bristol",
      "value": 356,
      "detail": "orders packed per hour",
      "highlight": true
    },
    {
      "label": "Glasgow",
      "value": 298,
      "detail": "orders packed per hour"
    },
    {
      "label": "Cardiff",
      "value": 214,
      "detail": "orders packed per hour"
    },
    {
      "label": "Belfast",
      "value": 130,
      "detail": "opened in March"
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

![slideBars example 2, light](images/slide-bars-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideBars example 2, dark](images/slide-bars-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
| Label | Value |
| - | - |
| Search | 92 |
| Checkout | 88 |
| Basket | 81 |
| Account | 74 |
| **● Reviews** | **63** |
| Wishlist | 51 |
```

:::

:::{tab-item} Text
:sync: text

```text
Label      Value
---------  -----
Search     92
Checkout   88
Basket     81
Account    74
● Reviews  63
Wishlist   51
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
          "text": "Label"
        },
        {
          "type": "raw_text",
          "text": "Value"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Search"
        },
        {
          "type": "raw_text",
          "text": "92"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Checkout"
        },
        {
          "type": "raw_text",
          "text": "88"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Basket"
        },
        {
          "type": "raw_text",
          "text": "81"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Account"
        },
        {
          "type": "raw_text",
          "text": "74"
        }
      ],
      [
        {
          "type": "rich_text",
          "elements": [
            {
              "type": "rich_text_section",
              "elements": [
                {
                  "type": "text",
                  "text": "● Reviews",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "rich_text",
          "elements": [
            {
              "type": "rich_text_section",
              "elements": [
                {
                  "type": "text",
                  "text": "63",
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
          "text": "Wishlist"
        },
        {
          "type": "raw_text",
          "text": "51"
        }
      ]
    ],
    "column_settings": [
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

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22table%22%2C%22rows%22%3A%5B%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Label%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Value%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Search%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%2292%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Checkout%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%2288%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Basket%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%2281%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Account%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%2274%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20Reviews%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%2263%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Wishlist%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%2251%22%7D%5D%5D%2C%22column_settings%22%3A%5B%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideBars",
  "max": 100,
  "items": [
    {
      "label": "Search",
      "value": 92
    },
    {
      "label": "Checkout",
      "value": 88
    },
    {
      "label": "Basket",
      "value": 81
    },
    {
      "label": "Account",
      "value": 74
    },
    {
      "label": "Reviews",
      "value": 63,
      "highlight": true
    },
    {
      "label": "Wishlist",
      "value": 51
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

![slideBars example 3, light](images/slide-bars-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideBars example 3, dark](images/slide-bars-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
| Label | Value | Detail |
| - | - | - |
| Monday | 1840 | bank holiday backlog |
| Tuesday | 1310 | normal volume |
| Wednesday | 1275 | normal volume |
| Thursday | 1402 | promotion started |
| Friday | 1618 | promotion peak |
| Sunday | 0 | warehouse closed |
```

:::

:::{tab-item} Text
:sync: text

```text
Label      Value  Detail
---------  -----  --------------------
Monday     1840   bank holiday backlog
Tuesday    1310   normal volume
Wednesday  1275   normal volume
Thursday   1402   promotion started
Friday     1618   promotion peak
Sunday     0      warehouse closed
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
          "text": "Label"
        },
        {
          "type": "raw_text",
          "text": "Value"
        },
        {
          "type": "raw_text",
          "text": "Detail"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Monday"
        },
        {
          "type": "raw_text",
          "text": "1840"
        },
        {
          "type": "raw_text",
          "text": "bank holiday backlog"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Tuesday"
        },
        {
          "type": "raw_text",
          "text": "1310"
        },
        {
          "type": "raw_text",
          "text": "normal volume"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Wednesday"
        },
        {
          "type": "raw_text",
          "text": "1275"
        },
        {
          "type": "raw_text",
          "text": "normal volume"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Thursday"
        },
        {
          "type": "raw_text",
          "text": "1402"
        },
        {
          "type": "raw_text",
          "text": "promotion started"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Friday"
        },
        {
          "type": "raw_text",
          "text": "1618"
        },
        {
          "type": "raw_text",
          "text": "promotion peak"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Sunday"
        },
        {
          "type": "raw_text",
          "text": "0"
        },
        {
          "type": "raw_text",
          "text": "warehouse closed"
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

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22table%22%2C%22rows%22%3A%5B%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Label%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Value%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Detail%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Monday%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%221840%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22bank%20holiday%20backlog%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Tuesday%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%221310%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22normal%20volume%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Wednesday%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%221275%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22normal%20volume%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Thursday%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%221402%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22promotion%20started%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Friday%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%221618%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22promotion%20peak%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Sunday%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%220%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22warehouse%20closed%22%7D%5D%5D%2C%22column_settings%22%3A%5B%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideBars",
  "items": [
    {
      "label": "Monday",
      "value": 1840,
      "detail": "bank holiday backlog"
    },
    {
      "label": "Tuesday",
      "value": 1310,
      "detail": "normal volume"
    },
    {
      "label": "Wednesday",
      "value": 1275,
      "detail": "normal volume"
    },
    {
      "label": "Thursday",
      "value": 1402,
      "detail": "promotion started"
    },
    {
      "label": "Friday",
      "value": 1618,
      "detail": "promotion peak"
    },
    {
      "label": "Sunday",
      "value": 0,
      "detail": "warehouse closed"
    }
  ]
}
```

:::

::::
