---
navigation_title: slideStack
---

# `slideStack`

Keep several nodes together as one block, one above the next, where a slot takes a single node.

## Use when

- A slot that takes one node, such as a slideTitle aside, needs two.
- Nodes need tighter or looser spacing than the column around them gives.

## Avoid when

- The nodes sit directly in the slide body or a slideSplit pane, which already stack them.
- The two blocks belong side by side; use slideSplit.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideStack example 1, light](images/slide-stack-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideStack example 1, dark](images/slide-stack-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
**IN THE SPRING RELEASE**

- ✓ Saved carts across devices.
- ✓ Apple Pay at checkout.

```
npm run release -- --dry-run

npm run release
```
````

:::

:::{tab-item} Text
:sync: text

```text
IN THE SPRING RELEASE
✓ Saved carts across devices.
✓ Apple Pay at checkout.

npm run release -- --dry-run

npm run release
```

:::

:::{tab-item} Slack
:sync: slack

````json
[
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "*IN THE SPRING RELEASE*"
      }
    ]
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
                "text": "✓ "
              },
              {
                "type": "text",
                "text": "Saved carts across devices."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "✓ "
              },
              {
                "type": "text",
                "text": "Apple Pay at checkout."
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
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "```\nnpm run release -- --dry-run\n\nnpm run release\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*IN%20THE%20SPRING%20RELEASE*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Saved%20carts%20across%20devices.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Apple%20Pay%20at%20checkout.%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%60%60%60%5Cnnpm%20run%20release%20--%20--dry-run%5Cn%5Cnnpm%20run%20release%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideStack",
  "items": [
    {
      "type": "slideBulletList",
      "label": "In the spring release",
      "marker": "check",
      "items": [
        "Saved carts across devices.",
        "Apple Pay at checkout."
      ]
    },
    {
      "type": "slideCode",
      "panels": [
        {
          "lines": [
            "npm run release -- --dry-run",
            "",
            "npm run release"
          ]
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

![slideStack example 2, light](images/slide-stack-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideStack example 2, dark](images/slide-stack-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
**IN THE SPRING RELEASE**

- ✓ Saved carts across devices.
- ✓ Apple Pay at checkout.

```
npm run release -- --dry-run

npm run release
```
````

:::

:::{tab-item} Text
:sync: text

```text
IN THE SPRING RELEASE
✓ Saved carts across devices.
✓ Apple Pay at checkout.

npm run release -- --dry-run

npm run release
```

:::

:::{tab-item} Slack
:sync: slack

````json
[
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "*IN THE SPRING RELEASE*"
      }
    ]
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
                "text": "✓ "
              },
              {
                "type": "text",
                "text": "Saved carts across devices."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "✓ "
              },
              {
                "type": "text",
                "text": "Apple Pay at checkout."
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
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "```\nnpm run release -- --dry-run\n\nnpm run release\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*IN%20THE%20SPRING%20RELEASE*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Saved%20carts%20across%20devices.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Apple%20Pay%20at%20checkout.%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%60%60%60%5Cnnpm%20run%20release%20--%20--dry-run%5Cn%5Cnnpm%20run%20release%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideStack",
  "spacing": "tight",
  "items": [
    {
      "type": "slideBulletList",
      "label": "In the spring release",
      "marker": "check",
      "items": [
        "Saved carts across devices.",
        "Apple Pay at checkout."
      ]
    },
    {
      "type": "slideCode",
      "panels": [
        {
          "lines": [
            "npm run release -- --dry-run",
            "",
            "npm run release"
          ]
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

![slideStack example 3, light](images/slide-stack-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideStack example 3, dark](images/slide-stack-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
**IN THE SPRING RELEASE**

- ✓ Saved carts across devices.
- ✓ Apple Pay at checkout.

```
npm run release -- --dry-run

npm run release
```
````

:::

:::{tab-item} Text
:sync: text

```text
IN THE SPRING RELEASE
✓ Saved carts across devices.
✓ Apple Pay at checkout.

npm run release -- --dry-run

npm run release
```

:::

:::{tab-item} Slack
:sync: slack

````json
[
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "*IN THE SPRING RELEASE*"
      }
    ]
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
                "text": "✓ "
              },
              {
                "type": "text",
                "text": "Saved carts across devices."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "✓ "
              },
              {
                "type": "text",
                "text": "Apple Pay at checkout."
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
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "```\nnpm run release -- --dry-run\n\nnpm run release\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*IN%20THE%20SPRING%20RELEASE*%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Saved%20carts%20across%20devices.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%9C%93%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Apple%20Pay%20at%20checkout.%22%7D%5D%7D%5D%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%20%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%60%60%60%5Cnnpm%20run%20release%20--%20--dry-run%5Cn%5Cnnpm%20run%20release%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideStack",
  "spacing": "loose",
  "items": [
    {
      "type": "slideBulletList",
      "label": "In the spring release",
      "marker": "check",
      "items": [
        "Saved carts across devices.",
        "Apple Pay at checkout."
      ]
    },
    {
      "type": "slideCode",
      "panels": [
        {
          "lines": [
            "npm run release -- --dry-run",
            "",
            "npm run release"
          ]
        }
      ]
    }
  ]
}
```

:::

::::
