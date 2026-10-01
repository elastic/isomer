---
navigation_title: slideLayers
---

# `slideLayers`

Show how a system stacks, layer on layer, and who owns each layer, so the audience knows where a concern lives.

## Use when

- The parts sit on top of one another in a fixed order, and each rests on the one below.
- Each layer has a clear owner, and where ownership changes is part of the point.

## Avoid when

- The owners sit side by side with no order between them; use slideTerritoryGroup.
- The parts run in sequence rather than stack; use slidePipeline.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideLayers example 1, light](images/slide-layers-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideLayers example 1, dark](images/slide-layers-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
1. **Apps** — `ios`, `android`, `web` · ● _CLIENT TEAM_
2. **Gateway** — Routes, rate-limits, and authenticates every request · ● _PLATFORM_
3. **Services** — Orders, catalog, and **delivery slots**, each deployed on its own · _PRODUCT TEAMS_
4. **Data** — `postgres`, `redis`, `kafka` · _DATA TEAM_
5. **Cloud** — Compute, storage, and the network under all of it · ○ _PROVIDER_
```

:::

:::{tab-item} Text
:sync: text

```text
Apps — ios, android, web · ● CLIENT TEAM
Gateway — Routes, rate-limits, and authenticates every request · ● PLATFORM
Services — Orders, catalog, and delivery slots, each deployed on its own · PRODUCT TEAMS
Data — postgres, redis, kafka · DATA TEAM
Cloud — Compute, storage, and the network under all of it · ○ PROVIDER
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
        "style": "ordered",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Apps",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "ios",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": ", "
              },
              {
                "type": "text",
                "text": "android",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": ", "
              },
              {
                "type": "text",
                "text": "web",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": " · "
              },
              {
                "type": "text",
                "text": "● "
              },
              {
                "type": "text",
                "text": "CLIENT TEAM",
                "style": {
                  "italic": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Gateway",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "Routes, rate-limits, and authenticates every request"
              },
              {
                "type": "text",
                "text": " · "
              },
              {
                "type": "text",
                "text": "● "
              },
              {
                "type": "text",
                "text": "PLATFORM",
                "style": {
                  "italic": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Services",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "Orders, catalog, and "
              },
              {
                "type": "text",
                "text": "delivery slots",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": ", each deployed on its own"
              },
              {
                "type": "text",
                "text": " · "
              },
              {
                "type": "text",
                "text": "PRODUCT TEAMS",
                "style": {
                  "italic": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Data",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "postgres",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": ", "
              },
              {
                "type": "text",
                "text": "redis",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": ", "
              },
              {
                "type": "text",
                "text": "kafka",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": " · "
              },
              {
                "type": "text",
                "text": "DATA TEAM",
                "style": {
                  "italic": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Cloud",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "Compute, storage, and the network under all of it"
              },
              {
                "type": "text",
                "text": " · "
              },
              {
                "type": "text",
                "text": "○ "
              },
              {
                "type": "text",
                "text": "PROVIDER",
                "style": {
                  "italic": true
                }
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22ordered%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Apps%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22ios%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%2C%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22android%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%2C%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22web%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%C2%B7%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22CLIENT%20TEAM%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Gateway%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Routes%2C%20rate-limits%2C%20and%20authenticates%20every%20request%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%C2%B7%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22PLATFORM%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Services%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Orders%2C%20catalog%2C%20and%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22delivery%20slots%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%2C%20each%20deployed%20on%20its%20own%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%C2%B7%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22PRODUCT%20TEAMS%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Data%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22postgres%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%2C%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22redis%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%2C%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22kafka%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%C2%B7%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22DATA%20TEAM%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Cloud%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Compute%2C%20storage%2C%20and%20the%20network%20under%20all%20of%20it%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%C2%B7%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8B%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22PROVIDER%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideLayers",
  "layers": [
    {
      "name": "Apps",
      "chips": [
        "ios",
        "android",
        "web"
      ],
      "owner": "Client team",
      "tone": "primary"
    },
    {
      "name": "Gateway",
      "body": "Routes, rate-limits, and authenticates every request",
      "owner": "Platform",
      "tone": "primary"
    },
    {
      "name": "Services",
      "body": "Orders, catalog, and **delivery slots**, each deployed on its own",
      "owner": "Product teams"
    },
    {
      "name": "Data",
      "chips": [
        "postgres",
        "redis",
        "kafka"
      ],
      "owner": "Data team"
    },
    {
      "name": "Cloud",
      "body": "Compute, storage, and the network under all of it",
      "owner": "Provider",
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

![slideLayers example 2, light](images/slide-layers-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideLayers example 2, dark](images/slide-layers-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
1. **Roof** — Solar panels and the rainwater tanks · ○ _LANDLORD_
2. **Offices** — Four floors of leased desks and meeting rooms · _TENANTS_
3. **Lobby** — `reception`, `café`, `mail room`, `lockers`, `gym`, `bike store` · ● _FACILITIES_
4. **Parking** — Two levels, with chargers on the lower one · ● _FACILITIES_
5. **Plant room** — `boilers`, `chillers`, `generator` · _CONTRACTOR_
6. **Foundations** — Concrete piles driven twenty meters into clay · ○ _LANDLORD_
```

:::

:::{tab-item} Text
:sync: text

```text
Roof — Solar panels and the rainwater tanks · ○ LANDLORD
Offices — Four floors of leased desks and meeting rooms · TENANTS
Lobby — reception, café, mail room, lockers, gym, bike store · ● FACILITIES
Parking — Two levels, with chargers on the lower one · ● FACILITIES
Plant room — boilers, chillers, generator · CONTRACTOR
Foundations — Concrete piles driven twenty meters into clay · ○ LANDLORD
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
        "style": "ordered",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Roof",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "Solar panels and the rainwater tanks"
              },
              {
                "type": "text",
                "text": " · "
              },
              {
                "type": "text",
                "text": "○ "
              },
              {
                "type": "text",
                "text": "LANDLORD",
                "style": {
                  "italic": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Offices",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "Four floors of leased desks and meeting rooms"
              },
              {
                "type": "text",
                "text": " · "
              },
              {
                "type": "text",
                "text": "TENANTS",
                "style": {
                  "italic": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Lobby",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "reception",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": ", "
              },
              {
                "type": "text",
                "text": "café",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": ", "
              },
              {
                "type": "text",
                "text": "mail room",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": ", "
              },
              {
                "type": "text",
                "text": "lockers",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": ", "
              },
              {
                "type": "text",
                "text": "gym",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": ", "
              },
              {
                "type": "text",
                "text": "bike store",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": " · "
              },
              {
                "type": "text",
                "text": "● "
              },
              {
                "type": "text",
                "text": "FACILITIES",
                "style": {
                  "italic": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Parking",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "Two levels, with chargers on the lower one"
              },
              {
                "type": "text",
                "text": " · "
              },
              {
                "type": "text",
                "text": "● "
              },
              {
                "type": "text",
                "text": "FACILITIES",
                "style": {
                  "italic": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Plant room",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "boilers",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": ", "
              },
              {
                "type": "text",
                "text": "chillers",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": ", "
              },
              {
                "type": "text",
                "text": "generator",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": " · "
              },
              {
                "type": "text",
                "text": "CONTRACTOR",
                "style": {
                  "italic": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Foundations",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "Concrete piles driven twenty meters into clay"
              },
              {
                "type": "text",
                "text": " · "
              },
              {
                "type": "text",
                "text": "○ "
              },
              {
                "type": "text",
                "text": "LANDLORD",
                "style": {
                  "italic": true
                }
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22ordered%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Roof%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Solar%20panels%20and%20the%20rainwater%20tanks%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%C2%B7%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8B%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22LANDLORD%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Offices%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Four%20floors%20of%20leased%20desks%20and%20meeting%20rooms%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%C2%B7%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22TENANTS%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Lobby%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22reception%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%2C%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22caf%C3%A9%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%2C%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22mail%20room%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%2C%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22lockers%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%2C%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22gym%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%2C%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22bike%20store%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%C2%B7%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22FACILITIES%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Parking%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Two%20levels%2C%20with%20chargers%20on%20the%20lower%20one%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%C2%B7%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22FACILITIES%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Plant%20room%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22boilers%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%2C%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22chillers%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%2C%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22generator%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%C2%B7%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22CONTRACTOR%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Foundations%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Concrete%20piles%20driven%20twenty%20meters%20into%20clay%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%C2%B7%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8B%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22LANDLORD%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideLayers",
  "layers": [
    {
      "name": "Roof",
      "body": "Solar panels and the rainwater tanks",
      "owner": "Landlord",
      "tone": "accent"
    },
    {
      "name": "Offices",
      "body": "Four floors of leased desks and meeting rooms",
      "owner": "Tenants"
    },
    {
      "name": "Lobby",
      "chips": [
        "reception",
        "café",
        "mail room",
        "lockers",
        "gym",
        "bike store"
      ],
      "owner": "Facilities",
      "tone": "primary"
    },
    {
      "name": "Parking",
      "body": "Two levels, with chargers on the lower one",
      "owner": "Facilities",
      "tone": "primary"
    },
    {
      "name": "Plant room",
      "chips": [
        "boilers",
        "chillers",
        "generator"
      ],
      "owner": "Contractor"
    },
    {
      "name": "Foundations",
      "body": "Concrete piles driven twenty meters into clay",
      "owner": "Landlord",
      "tone": "accent"
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

![slideLayers example 3, light](images/slide-layers-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideLayers example 3, dark](images/slide-layers-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
1. **HTTP** — Requests and responses your code reads and writes · ● _YOUR APP_
2. **TLS** — Encrypts the bytes and proves who the server is · _THE LIBRARY_
3. **TCP** — Delivers the bytes in order, resending what gets lost · _THE OS_
```

:::

:::{tab-item} Text
:sync: text

```text
HTTP — Requests and responses your code reads and writes · ● YOUR APP
TLS — Encrypts the bytes and proves who the server is · THE LIBRARY
TCP — Delivers the bytes in order, resending what gets lost · THE OS
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
        "style": "ordered",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "HTTP",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "Requests and responses your code reads and writes"
              },
              {
                "type": "text",
                "text": " · "
              },
              {
                "type": "text",
                "text": "● "
              },
              {
                "type": "text",
                "text": "YOUR APP",
                "style": {
                  "italic": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "TLS",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "Encrypts the bytes and proves who the server is"
              },
              {
                "type": "text",
                "text": " · "
              },
              {
                "type": "text",
                "text": "THE LIBRARY",
                "style": {
                  "italic": true
                }
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "TCP",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "Delivers the bytes in order, resending what gets lost"
              },
              {
                "type": "text",
                "text": " · "
              },
              {
                "type": "text",
                "text": "THE OS",
                "style": {
                  "italic": true
                }
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22ordered%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22HTTP%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Requests%20and%20responses%20your%20code%20reads%20and%20writes%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%C2%B7%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22YOUR%20APP%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22TLS%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Encrypts%20the%20bytes%20and%20proves%20who%20the%20server%20is%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%C2%B7%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22THE%20LIBRARY%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22TCP%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Delivers%20the%20bytes%20in%20order%2C%20resending%20what%20gets%20lost%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%C2%B7%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22THE%20OS%22%2C%22style%22%3A%7B%22italic%22%3Atrue%7D%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideLayers",
  "layers": [
    {
      "name": "HTTP",
      "body": "Requests and responses your code reads and writes",
      "owner": "Your app",
      "tone": "primary"
    },
    {
      "name": "TLS",
      "body": "Encrypts the bytes and proves who the server is",
      "owner": "The library"
    },
    {
      "name": "TCP",
      "body": "Delivers the bytes in order, resending what gets lost",
      "owner": "The OS"
    }
  ]
}
```

:::

::::
