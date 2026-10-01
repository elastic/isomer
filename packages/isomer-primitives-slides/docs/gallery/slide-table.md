---
navigation_title: slideTable
---

# `slideTable`

Let the reader compare several items across the same attributes, reading across a row or down a column.

## Use when

- Every item has a value for the same two to six attributes, such as regions by orders, latency, and errors.
- The items fall into a few named groups, such as required and optional services.

## Avoid when

- Each item is a name and one line about it; use slideList.
- Every cell answers yes, partly, or no, and marks would read faster than words; use slideMatrix.
- There are more than twelve rows; split them across two slides, each with its own slideTable.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideTable example 1, light](images/slide-table-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTable example 1, dark](images/slide-table-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**CHECKOUT, LAST 24 HOURS**

| REGION | ORDERS | P99 LATENCY | ERRORS |
| - | - | - | - |
| **Europe** | 48,210 | 410 ms | 0.2% |
| **North America** | 61,905 | 380 ms | 0.1% |
| **Asia Pacific** | 22,764 | 1.9 s | 2.4% |
```

:::

:::{tab-item} Text
:sync: text

```text
CHECKOUT, LAST 24 HOURS
REGION         ORDERS  P99 LATENCY  ERRORS
-------------  ------  -----------  ------
Europe         48,210  410 ms       0.2%
North America  61,905  380 ms       0.1%
Asia Pacific   22,764  1.9 s        2.4%
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "*CHECKOUT, LAST 24 HOURS*"
      }
    ]
  },
  {
    "type": "table",
    "rows": [
      [
        {
          "type": "raw_text",
          "text": "REGION"
        },
        {
          "type": "raw_text",
          "text": "ORDERS"
        },
        {
          "type": "raw_text",
          "text": "P99 LATENCY"
        },
        {
          "type": "raw_text",
          "text": "ERRORS"
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
                  "text": "Europe",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "48,210"
        },
        {
          "type": "raw_text",
          "text": "410 ms"
        },
        {
          "type": "raw_text",
          "text": "0.2%"
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
                  "text": "North America",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "61,905"
        },
        {
          "type": "raw_text",
          "text": "380 ms"
        },
        {
          "type": "raw_text",
          "text": "0.1%"
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
                  "text": "Asia Pacific",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "22,764"
        },
        {
          "type": "raw_text",
          "text": "1.9 s"
        },
        {
          "type": "raw_text",
          "text": "2.4%"
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
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*CHECKOUT%2C%20LAST%2024%20HOURS*%22%7D%5D%7D%2C%7B%22type%22%3A%22table%22%2C%22rows%22%3A%5B%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22REGION%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22ORDERS%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22P99%20LATENCY%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22ERRORS%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Europe%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%2248%2C210%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22410%20ms%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%220.2%25%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22North%20America%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%2261%2C905%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22380%20ms%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%220.1%25%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Asia%20Pacific%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%2222%2C764%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%221.9%20s%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%222.4%25%22%7D%5D%5D%2C%22column_settings%22%3A%5B%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTable",
  "label": "Checkout, last 24 hours",
  "columns": [
    "Region",
    "Orders",
    "p99 latency",
    "Errors"
  ],
  "rowHeaders": true,
  "rows": [
    [
      "Europe",
      "48,210",
      "410 ms",
      "0.2%"
    ],
    [
      "North America",
      "61,905",
      "380 ms",
      "0.1%"
    ],
    [
      "Asia Pacific",
      "22,764",
      "1.9 s",
      "2.4%"
    ]
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

![slideTable example 2, light](images/slide-table-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTable example 2, dark](images/slide-table-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
| STEP | OWNER | WHEN |
| - | - | - |
| Cut the release branch | Release captain | Monday |
| Run the smoke suite | QA | Tuesday |
| Tag and publish | Release captain | Wednesday |
```

:::

:::{tab-item} Text
:sync: text

```text
STEP                    OWNER            WHEN
----------------------  ---------------  ---------
Cut the release branch  Release captain  Monday
Run the smoke suite     QA               Tuesday
Tag and publish         Release captain  Wednesday
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
          "text": "STEP"
        },
        {
          "type": "raw_text",
          "text": "OWNER"
        },
        {
          "type": "raw_text",
          "text": "WHEN"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Cut the release branch"
        },
        {
          "type": "raw_text",
          "text": "Release captain"
        },
        {
          "type": "raw_text",
          "text": "Monday"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Run the smoke suite"
        },
        {
          "type": "raw_text",
          "text": "QA"
        },
        {
          "type": "raw_text",
          "text": "Tuesday"
        }
      ],
      [
        {
          "type": "raw_text",
          "text": "Tag and publish"
        },
        {
          "type": "raw_text",
          "text": "Release captain"
        },
        {
          "type": "raw_text",
          "text": "Wednesday"
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

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22table%22%2C%22rows%22%3A%5B%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22STEP%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22OWNER%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22WHEN%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Cut%20the%20release%20branch%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Release%20captain%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Monday%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Run%20the%20smoke%20suite%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22QA%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Tuesday%22%7D%5D%2C%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Tag%20and%20publish%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Release%20captain%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Wednesday%22%7D%5D%5D%2C%22column_settings%22%3A%5B%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTable",
  "columns": [
    "Step",
    "Owner",
    "When"
  ],
  "rows": [
    [
      "Cut the release branch",
      "Release captain",
      "Monday"
    ],
    [
      "Run the smoke suite",
      "QA",
      "Tuesday"
    ],
    [
      "Tag and publish",
      "Release captain",
      "Wednesday"
    ]
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

![slideTable example 3, light](images/slide-table-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTable example 3, dark](images/slide-table-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**EVERY ORDER**

| SERVICE | ROLE | ON CALL |
| - | - | - |
| **cart-api** | Holds the basket | Payments |
| **ledger** | Records the charge | Finance platform |

**ONLY ON REFUNDS**

| SERVICE | ROLE | ON CALL |
| - | - | - |
| **refund-worker** | Reverses the charge | Payments |
| **notifier** | Emails the customer | Growth |
```

:::

:::{tab-item} Text
:sync: text

```text
SERVICE        ROLE                 ON CALL
-------------  -------------------  ----------------
EVERY ORDER
cart-api       Holds the basket     Payments
ledger         Records the charge   Finance platform
ONLY ON REFUNDS
refund-worker  Reverses the charge  Payments
notifier       Emails the customer  Growth
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
          "text": "SERVICE"
        },
        {
          "type": "raw_text",
          "text": "ROLE"
        },
        {
          "type": "raw_text",
          "text": "ON CALL"
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
                  "text": "EVERY ORDER",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": ""
        },
        {
          "type": "raw_text",
          "text": ""
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
                  "text": "cart-api",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "Holds the basket"
        },
        {
          "type": "raw_text",
          "text": "Payments"
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
                  "text": "ledger",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "Records the charge"
        },
        {
          "type": "raw_text",
          "text": "Finance platform"
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
                  "text": "ONLY ON REFUNDS",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": ""
        },
        {
          "type": "raw_text",
          "text": ""
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
                  "text": "refund-worker",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "Reverses the charge"
        },
        {
          "type": "raw_text",
          "text": "Payments"
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
                  "text": "notifier",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "Emails the customer"
        },
        {
          "type": "raw_text",
          "text": "Growth"
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

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22table%22%2C%22rows%22%3A%5B%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22SERVICE%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22ROLE%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22ON%20CALL%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22EVERY%20ORDER%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22cart-api%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Holds%20the%20basket%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Payments%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22ledger%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Records%20the%20charge%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Finance%20platform%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22ONLY%20ON%20REFUNDS%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22refund-worker%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Reverses%20the%20charge%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Payments%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22notifier%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Emails%20the%20customer%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22Growth%22%7D%5D%5D%2C%22column_settings%22%3A%5B%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTable",
  "columns": [
    "Service",
    "Role",
    "On call"
  ],
  "rowHeaders": true,
  "groups": [
    {
      "label": "Every order",
      "rows": [
        [
          "cart-api",
          "Holds the basket",
          "Payments"
        ],
        [
          "ledger",
          "Records the charge",
          "Finance platform"
        ]
      ]
    },
    {
      "label": "Only on refunds",
      "rows": [
        [
          "refund-worker",
          "Reverses the charge",
          "Payments"
        ],
        [
          "notifier",
          "Emails the customer",
          "Growth"
        ]
      ]
    }
  ]
}
```

:::

::::

### Example 4

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideTable example 4, light](images/slide-table-4-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTable example 4, dark](images/slide-table-4-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
**CHECKOUT BY MARKET, LAST 24 HOURS**

| MARKET | ORDERS | P99 LATENCY | ERRORS |
| - | - | - | - |
| **United Kingdom** | 18,204 | 390 ms | 0.2% |
| **Germany** | 15,730 | 410 ms | 0.1% |
| **France** | 12,118 | 405 ms | 0.2% |
| **Spain** | 8,962 | 420 ms | 0.3% |
| **Italy** | 8,410 | 430 ms | 0.2% |
| **Netherlands** | 6,275 | 380 ms | 0.1% |
| **United States** | 41,380 | 370 ms | 0.1% |
| **Canada** | 9,904 | 395 ms | 0.2% |
| **Mexico** | 5,621 | 460 ms | 0.4% |
| **Japan** | 11,506 | 1.7 s | 2.1% |
| **Australia** | 7,344 | 1.9 s | 2.6% |
| **Singapore** | 3,914 | 1.8 s | 2.2% |
```

:::

:::{tab-item} Text
:sync: text

```text
CHECKOUT BY MARKET, LAST 24 HOURS
MARKET          ORDERS  P99 LATENCY  ERRORS
--------------  ------  -----------  ------
United Kingdom  18,204  390 ms       0.2%
Germany         15,730  410 ms       0.1%
France          12,118  405 ms       0.2%
Spain           8,962   420 ms       0.3%
Italy           8,410   430 ms       0.2%
Netherlands     6,275   380 ms       0.1%
United States   41,380  370 ms       0.1%
Canada          9,904   395 ms       0.2%
Mexico          5,621   460 ms       0.4%
Japan           11,506  1.7 s        2.1%
Australia       7,344   1.9 s        2.6%
Singapore       3,914   1.8 s        2.2%
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "*CHECKOUT BY MARKET, LAST 24 HOURS*"
      }
    ]
  },
  {
    "type": "table",
    "rows": [
      [
        {
          "type": "raw_text",
          "text": "MARKET"
        },
        {
          "type": "raw_text",
          "text": "ORDERS"
        },
        {
          "type": "raw_text",
          "text": "P99 LATENCY"
        },
        {
          "type": "raw_text",
          "text": "ERRORS"
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
                  "text": "United Kingdom",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "18,204"
        },
        {
          "type": "raw_text",
          "text": "390 ms"
        },
        {
          "type": "raw_text",
          "text": "0.2%"
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
                  "text": "Germany",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "15,730"
        },
        {
          "type": "raw_text",
          "text": "410 ms"
        },
        {
          "type": "raw_text",
          "text": "0.1%"
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
                  "text": "France",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "12,118"
        },
        {
          "type": "raw_text",
          "text": "405 ms"
        },
        {
          "type": "raw_text",
          "text": "0.2%"
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
                  "text": "Spain",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "8,962"
        },
        {
          "type": "raw_text",
          "text": "420 ms"
        },
        {
          "type": "raw_text",
          "text": "0.3%"
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
                  "text": "Italy",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "8,410"
        },
        {
          "type": "raw_text",
          "text": "430 ms"
        },
        {
          "type": "raw_text",
          "text": "0.2%"
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
                  "text": "Netherlands",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "6,275"
        },
        {
          "type": "raw_text",
          "text": "380 ms"
        },
        {
          "type": "raw_text",
          "text": "0.1%"
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
                  "text": "United States",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "41,380"
        },
        {
          "type": "raw_text",
          "text": "370 ms"
        },
        {
          "type": "raw_text",
          "text": "0.1%"
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
                  "text": "Canada",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "9,904"
        },
        {
          "type": "raw_text",
          "text": "395 ms"
        },
        {
          "type": "raw_text",
          "text": "0.2%"
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
                  "text": "Mexico",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "5,621"
        },
        {
          "type": "raw_text",
          "text": "460 ms"
        },
        {
          "type": "raw_text",
          "text": "0.4%"
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
                  "text": "Japan",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "11,506"
        },
        {
          "type": "raw_text",
          "text": "1.7 s"
        },
        {
          "type": "raw_text",
          "text": "2.1%"
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
                  "text": "Australia",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "7,344"
        },
        {
          "type": "raw_text",
          "text": "1.9 s"
        },
        {
          "type": "raw_text",
          "text": "2.6%"
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
                  "text": "Singapore",
                  "style": {
                    "bold": true
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "raw_text",
          "text": "3,914"
        },
        {
          "type": "raw_text",
          "text": "1.8 s"
        },
        {
          "type": "raw_text",
          "text": "2.2%"
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
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*CHECKOUT%20BY%20MARKET%2C%20LAST%2024%20HOURS*%22%7D%5D%7D%2C%7B%22type%22%3A%22table%22%2C%22rows%22%3A%5B%5B%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22MARKET%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22ORDERS%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22P99%20LATENCY%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22ERRORS%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22United%20Kingdom%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%2218%2C204%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22390%20ms%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%220.2%25%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Germany%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%2215%2C730%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22410%20ms%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%220.1%25%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22France%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%2212%2C118%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22405%20ms%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%220.2%25%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Spain%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%228%2C962%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22420%20ms%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%220.3%25%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Italy%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%228%2C410%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22430%20ms%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%220.2%25%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Netherlands%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%226%2C275%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22380%20ms%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%220.1%25%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22United%20States%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%2241%2C380%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22370%20ms%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%220.1%25%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Canada%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%229%2C904%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22395%20ms%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%220.2%25%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Mexico%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%225%2C621%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%22460%20ms%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%220.4%25%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Japan%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%2211%2C506%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%221.7%20s%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%222.1%25%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Australia%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%227%2C344%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%221.9%20s%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%222.6%25%22%7D%5D%2C%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Singapore%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%223%2C914%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%221.8%20s%22%7D%2C%7B%22type%22%3A%22raw_text%22%2C%22text%22%3A%222.2%25%22%7D%5D%5D%2C%22column_settings%22%3A%5B%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%2C%7B%22is_wrapped%22%3Atrue%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTable",
  "label": "Checkout by market, last 24 hours",
  "columns": [
    "Market",
    "Orders",
    "p99 latency",
    "Errors"
  ],
  "rowHeaders": true,
  "rows": [
    [
      "United Kingdom",
      "18,204",
      "390 ms",
      "0.2%"
    ],
    [
      "Germany",
      "15,730",
      "410 ms",
      "0.1%"
    ],
    [
      "France",
      "12,118",
      "405 ms",
      "0.2%"
    ],
    [
      "Spain",
      "8,962",
      "420 ms",
      "0.3%"
    ],
    [
      "Italy",
      "8,410",
      "430 ms",
      "0.2%"
    ],
    [
      "Netherlands",
      "6,275",
      "380 ms",
      "0.1%"
    ],
    [
      "United States",
      "41,380",
      "370 ms",
      "0.1%"
    ],
    [
      "Canada",
      "9,904",
      "395 ms",
      "0.2%"
    ],
    [
      "Mexico",
      "5,621",
      "460 ms",
      "0.4%"
    ],
    [
      "Japan",
      "11,506",
      "1.7 s",
      "2.1%"
    ],
    [
      "Australia",
      "7,344",
      "1.9 s",
      "2.6%"
    ],
    [
      "Singapore",
      "3,914",
      "1.8 s",
      "2.2%"
    ]
  ]
}
```

:::

::::
