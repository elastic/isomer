---
navigation_title: slideTree
---

# `slideTree`

Show what is inside a folder and what each file is for, so the audience can find their way around it.

## Use when

- You walk through the layout of a package, service, or repository folder.
- Each file or subfolder earns a short note on its job.

## Avoid when

- The items are not files or folders; use slideList.
- The entries are terms to learn rather than paths; use slideDefinitions.
- The point is the code inside a file; use slideCode.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideTree example 1, light](images/slide-tree-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTree example 1, dark](images/slide-tree-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
```text
checkout/
├─ cart.ts           Line items, quantities, and the running total
├─ pricing.ts        Discounts and tax, applied in a fixed order
├─ payment/          One adapter per card network
├─ receipt.ts        The email and the in-app copy
└─ checkout.test.ts  Every path a real order has taken
```
````

:::

:::{tab-item} Text
:sync: text

```text
checkout/
├─ cart.ts           Line items, quantities, and the running total
├─ pricing.ts        Discounts and tax, applied in a fixed order
├─ payment/          One adapter per card network
├─ receipt.ts        The email and the in-app copy
└─ checkout.test.ts  Every path a real order has taken
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
        "type": "rich_text_preformatted",
        "elements": [
          {
            "type": "text",
            "text": "checkout/\n├─ cart.ts           Line items, quantities, and the running total\n├─ pricing.ts        Discounts and tax, applied in a fixed order\n├─ payment/          One adapter per card network\n├─ receipt.ts        The email and the in-app copy\n└─ checkout.test.ts  Every path a real order has taken"
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_preformatted%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22checkout%2F%5Cn%E2%94%9C%E2%94%80%20cart.ts%20%20%20%20%20%20%20%20%20%20%20Line%20items%2C%20quantities%2C%20and%20the%20running%20total%5Cn%E2%94%9C%E2%94%80%20pricing.ts%20%20%20%20%20%20%20%20Discounts%20and%20tax%2C%20applied%20in%20a%20fixed%20order%5Cn%E2%94%9C%E2%94%80%20payment%2F%20%20%20%20%20%20%20%20%20%20One%20adapter%20per%20card%20network%5Cn%E2%94%9C%E2%94%80%20receipt.ts%20%20%20%20%20%20%20%20The%20email%20and%20the%20in-app%20copy%5Cn%E2%94%94%E2%94%80%20checkout.test.ts%20%20Every%20path%20a%20real%20order%20has%20taken%22%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTree",
  "root": "checkout/",
  "entries": [
    {
      "name": "cart.ts",
      "body": "Line items, quantities, and the running total"
    },
    {
      "name": "pricing.ts",
      "body": "Discounts and tax, applied in a fixed order"
    },
    {
      "name": "payment/",
      "body": "One adapter per card network"
    },
    {
      "name": "receipt.ts",
      "body": "The email and the in-app copy"
    },
    {
      "name": "checkout.test.ts",
      "body": "Every path a real order has taken"
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

![slideTree example 2, light](images/slide-tree-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTree example 2, dark](images/slide-tree-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
```text
runbooks/
└─ failover.md  Steps to move traffic to the standby region
```
````

:::

:::{tab-item} Text
:sync: text

```text
runbooks/
└─ failover.md  Steps to move traffic to the standby region
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
        "type": "rich_text_preformatted",
        "elements": [
          {
            "type": "text",
            "text": "runbooks/\n└─ failover.md  Steps to move traffic to the standby region"
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_preformatted%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22runbooks%2F%5Cn%E2%94%94%E2%94%80%20failover.md%20%20Steps%20to%20move%20traffic%20to%20the%20standby%20region%22%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTree",
  "root": "runbooks/",
  "entries": [
    {
      "name": "failover.md",
      "body": "Steps to move traffic to the standby region"
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

![slideTree example 3, light](images/slide-tree-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTree example 3, dark](images/slide-tree-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
```text
release/
├─ CHANGELOG.md  What changed, for customers
├─ build.yml     Compiles and signs every artifact
├─ canary.yml    Sends one percent of traffic first
├─ rollback.yml  Restores the last healthy build
├─ flags.json    Features that ship dark
├─ smoke/        Checks that run after each stage
├─ dashboards/   Error rate and latency per region
└─ README.md     How to cut a release by hand
```
````

:::

:::{tab-item} Text
:sync: text

```text
release/
├─ CHANGELOG.md  What changed, for customers
├─ build.yml     Compiles and signs every artifact
├─ canary.yml    Sends one percent of traffic first
├─ rollback.yml  Restores the last healthy build
├─ flags.json    Features that ship dark
├─ smoke/        Checks that run after each stage
├─ dashboards/   Error rate and latency per region
└─ README.md     How to cut a release by hand
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
        "type": "rich_text_preformatted",
        "elements": [
          {
            "type": "text",
            "text": "release/\n├─ CHANGELOG.md  What changed, for customers\n├─ build.yml     Compiles and signs every artifact\n├─ canary.yml    Sends one percent of traffic first\n├─ rollback.yml  Restores the last healthy build\n├─ flags.json    Features that ship dark\n├─ smoke/        Checks that run after each stage\n├─ dashboards/   Error rate and latency per region\n└─ README.md     How to cut a release by hand"
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_preformatted%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22release%2F%5Cn%E2%94%9C%E2%94%80%20CHANGELOG.md%20%20What%20changed%2C%20for%20customers%5Cn%E2%94%9C%E2%94%80%20build.yml%20%20%20%20%20Compiles%20and%20signs%20every%20artifact%5Cn%E2%94%9C%E2%94%80%20canary.yml%20%20%20%20Sends%20one%20percent%20of%20traffic%20first%5Cn%E2%94%9C%E2%94%80%20rollback.yml%20%20Restores%20the%20last%20healthy%20build%5Cn%E2%94%9C%E2%94%80%20flags.json%20%20%20%20Features%20that%20ship%20dark%5Cn%E2%94%9C%E2%94%80%20smoke%2F%20%20%20%20%20%20%20%20Checks%20that%20run%20after%20each%20stage%5Cn%E2%94%9C%E2%94%80%20dashboards%2F%20%20%20Error%20rate%20and%20latency%20per%20region%5Cn%E2%94%94%E2%94%80%20README.md%20%20%20%20%20How%20to%20cut%20a%20release%20by%20hand%22%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTree",
  "root": "release/",
  "entries": [
    {
      "name": "CHANGELOG.md",
      "body": "What changed, for customers"
    },
    {
      "name": "build.yml",
      "body": "Compiles and signs every artifact"
    },
    {
      "name": "canary.yml",
      "body": "Sends one percent of traffic first"
    },
    {
      "name": "rollback.yml",
      "body": "Restores the last healthy build"
    },
    {
      "name": "flags.json",
      "body": "Features that ship dark"
    },
    {
      "name": "smoke/",
      "body": "Checks that run after each stage"
    },
    {
      "name": "dashboards/",
      "body": "Error rate and latency per region"
    },
    {
      "name": "README.md",
      "body": "How to cut a release by hand"
    }
  ]
}
```

:::

::::
