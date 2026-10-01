---
navigation_title: slideTerritoryGroup
---

# `slideTerritoryGroup`

Show who owns what, so the audience knows which side is responsible for each part.

## Use when

- Responsibility splits between your side and another (a host, partner, or vendor), and color should key it.
- Each owner fits a short title and one or two sentences.

## Avoid when

- Two sides each hold a list of items, with a divider between; use slideSplit.
- Ownership is not the point of the slide; use slideBulletList.
- The owned parts stack in order, each resting on the one below; use slideLayers.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideTerritoryGroup example 1, light](images/slide-territory-group-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTerritoryGroup example 1, dark](images/slide-territory-group-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
## ● Payments team

Card capture, fraud checks, and **the ledger write**.

## ○ Card network

Authorization, chargebacks, and settlement timing.
```

:::

:::{tab-item} Text
:sync: text

```text
● Payments team: Card capture, fraud checks, and the ledger write.
○ Card network: Authorization, chargebacks, and settlement timing.
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "section",
    "fields": [
      {
        "type": "mrkdwn",
        "text": "● *Payments team*\nCard capture, fraud checks, and *the ledger write*."
      },
      {
        "type": "mrkdwn",
        "text": "○ *Card network*\nAuthorization, chargebacks, and settlement timing."
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22fields%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%E2%97%8F%20*Payments%20team*%5CnCard%20capture%2C%20fraud%20checks%2C%20and%20*the%20ledger%20write*.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%E2%97%8B%20*Card%20network*%5CnAuthorization%2C%20chargebacks%2C%20and%20settlement%20timing.%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTerritoryGroup",
  "items": [
    {
      "title": "Payments team",
      "body": "Card capture, fraud checks, and **the ledger write**.",
      "tone": "primary"
    },
    {
      "title": "Card network",
      "body": "Authorization, chargebacks, and settlement timing.",
      "tone": "accent"
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

![slideTerritoryGroup example 2, light](images/slide-territory-group-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideTerritoryGroup example 2, dark](images/slide-territory-group-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
## Storefront

Catalog, search, and the cart.

## ● Fulfillment

Picking, packing, and handoff.

## ○ Couriers

The drive and proof of delivery.

## ○ Stores

Stock counts and substitutions.
```

:::

:::{tab-item} Text
:sync: text

```text
Storefront: Catalog, search, and the cart.
● Fulfillment: Picking, packing, and handoff.
○ Couriers: The drive and proof of delivery.
○ Stores: Stock counts and substitutions.
```

:::

:::{tab-item} Slack
:sync: slack

```json
[
  {
    "type": "section",
    "fields": [
      {
        "type": "mrkdwn",
        "text": "*Storefront*\nCatalog, search, and the cart."
      },
      {
        "type": "mrkdwn",
        "text": "● *Fulfillment*\nPicking, packing, and handoff."
      },
      {
        "type": "mrkdwn",
        "text": "○ *Couriers*\nThe drive and proof of delivery."
      },
      {
        "type": "mrkdwn",
        "text": "○ *Stores*\nStock counts and substitutions."
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22fields%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Storefront*%5CnCatalog%2C%20search%2C%20and%20the%20cart.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%E2%97%8F%20*Fulfillment*%5CnPicking%2C%20packing%2C%20and%20handoff.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%E2%97%8B%20*Couriers*%5CnThe%20drive%20and%20proof%20of%20delivery.%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%E2%97%8B%20*Stores*%5CnStock%20counts%20and%20substitutions.%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideTerritoryGroup",
  "items": [
    {
      "title": "Storefront",
      "body": "Catalog, search, and the cart."
    },
    {
      "title": "Fulfillment",
      "body": "Picking, packing, and handoff.",
      "tone": "primary"
    },
    {
      "title": "Couriers",
      "body": "The drive and proof of delivery.",
      "tone": "accent"
    },
    {
      "title": "Stores",
      "body": "Stock counts and substitutions.",
      "tone": "accent"
    }
  ]
}
```

:::

::::
