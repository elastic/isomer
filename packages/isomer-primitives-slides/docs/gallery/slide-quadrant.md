---
navigation_title: slideQuadrant
---

# `slideQuadrant`

Sort a handful of things by two qualities at once, so the audience sees which group each one falls in.

## Use when

- Two independent yes-or-no qualities split the options into four groups worth naming, such as effort against impact.
- You want the audience to find where each option lands, not read exact scores.

## Avoid when

- The options differ on one quality only; use slideBars.
- Each option has several attributes to compare side by side; use slideTable.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideQuadrant example 1, light](images/slide-quadrant-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideQuadrant example 1, dark](images/slide-quadrant-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
y: MINOR → MAJOR · x: EASY → HARD

- **Quick wins** (Major, Easy): dark mode, saved carts
- **Big bets** (Major, Hard): same-day
- **Fill-ins** (Minor, Easy): new icons, sitemap
- **Money pits** (Minor, Hard): own fleet
```

:::

:::{tab-item} Text
:sync: text

```text
y: MINOR → MAJOR · x: EASY → HARD
Quick wins (Major, Easy): dark mode, saved carts
Big bets (Major, Hard): same-day
Fill-ins (Minor, Easy): new icons, sitemap
Money pits (Minor, Hard): own fleet
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
        "text": "y: MINOR → MAJOR · x: EASY → HARD"
      }
    ]
  },
  {
    "type": "section",
    "fields": [
      {
        "type": "mrkdwn",
        "text": "*Quick wins* (Major, Easy): dark mode, saved carts"
      },
      {
        "type": "mrkdwn",
        "text": "*Big bets* (Major, Hard): same-day"
      },
      {
        "type": "mrkdwn",
        "text": "*Fill-ins* (Minor, Easy): new icons, sitemap"
      },
      {
        "type": "mrkdwn",
        "text": "*Money pits* (Minor, Hard): own fleet"
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22y%3A%20MINOR%20%E2%86%92%20MAJOR%20%C2%B7%20x%3A%20EASY%20%E2%86%92%20HARD%22%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22fields%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Quick%20wins*%20(Major%2C%20Easy)%3A%20dark%20mode%2C%20saved%20carts%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Big%20bets*%20(Major%2C%20Hard)%3A%20same-day%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Fill-ins*%20(Minor%2C%20Easy)%3A%20new%20icons%2C%20sitemap%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Money%20pits*%20(Minor%2C%20Hard)%3A%20own%20fleet%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideQuadrant",
  "x": {
    "low": "Easy",
    "high": "Hard"
  },
  "y": {
    "low": "Minor",
    "high": "Major"
  },
  "quadrants": [
    {
      "label": "Quick wins",
      "items": [
        "dark mode",
        "saved carts"
      ]
    },
    {
      "label": "Big bets",
      "items": [
        "same-day"
      ]
    },
    {
      "label": "Fill-ins",
      "items": [
        "new icons",
        "sitemap"
      ]
    },
    {
      "label": "Money pits",
      "items": [
        "own fleet"
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

![slideQuadrant example 2, light](images/slide-quadrant-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideQuadrant example 2, dark](images/slide-quadrant-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
y: SLOW → POPULAR · x: THIN MARGIN → RICH MARGIN

- **● Plowhorses** (Popular, Thin margin): drip, bagel, muffin, tea
- **Stars** (Popular, Rich margin): latte, cold brew
- **Dogs** (Slow, Thin margin)
- **Puzzles** (Slow, Rich margin): matcha, affogato, cortado
```

:::

:::{tab-item} Text
:sync: text

```text
y: SLOW → POPULAR · x: THIN MARGIN → RICH MARGIN
● Plowhorses (Popular, Thin margin): drip, bagel, muffin, tea
Stars (Popular, Rich margin): latte, cold brew
Dogs (Slow, Thin margin)
Puzzles (Slow, Rich margin): matcha, affogato, cortado
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
        "text": "y: SLOW → POPULAR · x: THIN MARGIN → RICH MARGIN"
      }
    ]
  },
  {
    "type": "section",
    "fields": [
      {
        "type": "mrkdwn",
        "text": "*● Plowhorses* (Popular, Thin margin): drip, bagel, muffin, tea"
      },
      {
        "type": "mrkdwn",
        "text": "*Stars* (Popular, Rich margin): latte, cold brew"
      },
      {
        "type": "mrkdwn",
        "text": "*Dogs* (Slow, Thin margin)"
      },
      {
        "type": "mrkdwn",
        "text": "*Puzzles* (Slow, Rich margin): matcha, affogato, cortado"
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22y%3A%20SLOW%20%E2%86%92%20POPULAR%20%C2%B7%20x%3A%20THIN%20MARGIN%20%E2%86%92%20RICH%20MARGIN%22%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22fields%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*%E2%97%8F%20Plowhorses*%20(Popular%2C%20Thin%20margin)%3A%20drip%2C%20bagel%2C%20muffin%2C%20tea%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Stars*%20(Popular%2C%20Rich%20margin)%3A%20latte%2C%20cold%20brew%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Dogs*%20(Slow%2C%20Thin%20margin)%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Puzzles*%20(Slow%2C%20Rich%20margin)%3A%20matcha%2C%20affogato%2C%20cortado%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideQuadrant",
  "highlight": 0,
  "x": {
    "low": "Thin margin",
    "high": "Rich margin"
  },
  "y": {
    "low": "Slow",
    "high": "Popular"
  },
  "quadrants": [
    {
      "label": "Plowhorses",
      "items": [
        "drip",
        "bagel",
        "muffin",
        "tea"
      ]
    },
    {
      "label": "Stars",
      "items": [
        "latte",
        "cold brew"
      ]
    },
    {
      "label": "Dogs",
      "items": []
    },
    {
      "label": "Puzzles",
      "items": [
        "matcha",
        "affogato",
        "cortado"
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

![slideQuadrant example 3, light](images/slide-quadrant-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideQuadrant example 3, dark](images/slide-quadrant-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
y: LOW VALUE → HIGH VALUE · x: CHEAP → COSTLY

- **Do now** (High value, Cheap): search fix, saved carts, receipts, dark mode
- **Plan for** (High value, Costly): same-day, new app, loyalty, gift cards
- **If time allows** (Low value, Cheap): new icons, sitemap, favicons, emoji
- **Skip** (Low value, Costly): own fleet, drones, kiosks, vending
```

:::

:::{tab-item} Text
:sync: text

```text
y: LOW VALUE → HIGH VALUE · x: CHEAP → COSTLY
Do now (High value, Cheap): search fix, saved carts, receipts, dark mode
Plan for (High value, Costly): same-day, new app, loyalty, gift cards
If time allows (Low value, Cheap): new icons, sitemap, favicons, emoji
Skip (Low value, Costly): own fleet, drones, kiosks, vending
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
        "text": "y: LOW VALUE → HIGH VALUE · x: CHEAP → COSTLY"
      }
    ]
  },
  {
    "type": "section",
    "fields": [
      {
        "type": "mrkdwn",
        "text": "*Do now* (High value, Cheap): search fix, saved carts, receipts, dark mode"
      },
      {
        "type": "mrkdwn",
        "text": "*Plan for* (High value, Costly): same-day, new app, loyalty, gift cards"
      },
      {
        "type": "mrkdwn",
        "text": "*If time allows* (Low value, Cheap): new icons, sitemap, favicons, emoji"
      },
      {
        "type": "mrkdwn",
        "text": "*Skip* (Low value, Costly): own fleet, drones, kiosks, vending"
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22y%3A%20LOW%20VALUE%20%E2%86%92%20HIGH%20VALUE%20%C2%B7%20x%3A%20CHEAP%20%E2%86%92%20COSTLY%22%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22fields%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Do%20now*%20(High%20value%2C%20Cheap)%3A%20search%20fix%2C%20saved%20carts%2C%20receipts%2C%20dark%20mode%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Plan%20for*%20(High%20value%2C%20Costly)%3A%20same-day%2C%20new%20app%2C%20loyalty%2C%20gift%20cards%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*If%20time%20allows*%20(Low%20value%2C%20Cheap)%3A%20new%20icons%2C%20sitemap%2C%20favicons%2C%20emoji%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Skip*%20(Low%20value%2C%20Costly)%3A%20own%20fleet%2C%20drones%2C%20kiosks%2C%20vending%22%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideQuadrant",
  "x": {
    "low": "Cheap",
    "high": "Costly"
  },
  "y": {
    "low": "Low value",
    "high": "High value"
  },
  "quadrants": [
    {
      "label": "Do now",
      "items": [
        "search fix",
        "saved carts",
        "receipts",
        "dark mode"
      ]
    },
    {
      "label": "Plan for",
      "items": [
        "same-day",
        "new app",
        "loyalty",
        "gift cards"
      ]
    },
    {
      "label": "If time allows",
      "items": [
        "new icons",
        "sitemap",
        "favicons",
        "emoji"
      ]
    },
    {
      "label": "Skip",
      "items": [
        "own fleet",
        "drones",
        "kiosks",
        "vending"
      ]
    }
  ]
}
```

:::

::::
