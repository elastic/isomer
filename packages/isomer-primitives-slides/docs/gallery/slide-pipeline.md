---
navigation_title: slidePipeline
---

# `slidePipeline`

Walk the audience through the ordered steps of one process, from what goes in to what comes out.

## Use when

- You are explaining how one thing becomes another in two to six numbered steps, each with a sentence.
- You want to show who owns which run of a chain; add `spans` to bracket adjacent steps by owner.

## Avoid when

- Two separate paths run side by side and meet at one point; use slideLanes.
- Participants pass messages back and forth rather than handing off once; use slideSequence.
- One source feeds many targets; use slideFanout.
- The items have no order; use slideBulletList.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slidePipeline example 1, light](images/slide-pipeline-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slidePipeline example 1, dark](images/slide-pipeline-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
Refund request → Verify → Score → Approve → Settle → Ledger entry

1. **Verify** — Match the order, the amount, and the card on file. A mismatch goes to **a person**.
2. **Score** — The fraud model scores the request against the customer’s last ninety days.
3. **Approve** — Scores under the threshold approve on their own; the rest wait for review.
4. **Settle** — The processor returns the funds and posts one line to the ledger.
```

:::

:::{tab-item} Text
:sync: text

```text
Refund request → Verify → Score → Approve → Settle → Ledger entry
1. Verify — Match the order, the amount, and the card on file. A mismatch goes to a person.
2. Score — The fraud model scores the request against the customer’s last ninety days.
3. Approve — Scores under the threshold approve on their own; the rest wait for review.
4. Settle — The processor returns the funds and posts one line to the ledger.
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
        "text": "Refund request → Verify → Score → Approve → Settle → Ledger entry"
      }
    ]
  },
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
                "text": "Verify",
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
                "text": "Match the order, the amount, and the card on file. A mismatch goes to "
              },
              {
                "type": "text",
                "text": "a person",
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
                "text": "Score",
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
                "text": "The fraud model scores the request against the customer’s last ninety days."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Approve",
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
                "text": "Scores under the threshold approve on their own; the rest wait for review."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Settle",
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
                "text": "The processor returns the funds and posts one line to the ledger."
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Refund%20request%20%E2%86%92%20Verify%20%E2%86%92%20Score%20%E2%86%92%20Approve%20%E2%86%92%20Settle%20%E2%86%92%20Ledger%20entry%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22ordered%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Verify%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Match%20the%20order%2C%20the%20amount%2C%20and%20the%20card%20on%20file.%20A%20mismatch%20goes%20to%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22a%20person%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Score%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20fraud%20model%20scores%20the%20request%20against%20the%20customer%E2%80%99s%20last%20ninety%20days.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Approve%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Scores%20under%20the%20threshold%20approve%20on%20their%20own%3B%20the%20rest%20wait%20for%20review.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Settle%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20processor%20returns%20the%20funds%20and%20posts%20one%20line%20to%20the%20ledger.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slidePipeline",
  "start": "Refund request",
  "end": "Ledger entry",
  "steps": [
    {
      "title": "Verify",
      "body": "Match the order, the amount, and the card on file. A mismatch goes to **a person**."
    },
    {
      "title": "Score",
      "body": "The fraud model scores the request against the customer’s last ninety days."
    },
    {
      "title": "Approve",
      "body": "Scores under the threshold approve on their own; the rest wait for review."
    },
    {
      "title": "Settle",
      "body": "The processor returns the funds and posts one line to the ledger."
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

![slidePipeline example 2, light](images/slide-pipeline-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slidePipeline example 2, dark](images/slide-pipeline-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
Branch → Soak → Ship

1. **Branch** — Cut the `release` branch on Monday morning.
2. **Soak** — Run it in staging for two days under replayed traffic.
3. **Ship** — Roll out by region, watching error budgets between each.
```

:::

:::{tab-item} Text
:sync: text

```text
Branch → Soak → Ship
1. Branch — Cut the release branch on Monday morning.
2. Soak — Run it in staging for two days under replayed traffic.
3. Ship — Roll out by region, watching error budgets between each.
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
        "text": "Branch → Soak → Ship"
      }
    ]
  },
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
                "text": "Branch",
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
                "text": "Cut the "
              },
              {
                "type": "text",
                "text": "release",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": " branch on Monday morning."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Soak",
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
                "text": "Run it in staging for two days under replayed traffic."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Ship",
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
                "text": "Roll out by region, watching error budgets between each."
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Branch%20%E2%86%92%20Soak%20%E2%86%92%20Ship%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22ordered%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Branch%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Cut%20the%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22release%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20branch%20on%20Monday%20morning.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Soak%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Run%20it%20in%20staging%20for%20two%20days%20under%20replayed%20traffic.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Ship%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Roll%20out%20by%20region%2C%20watching%20error%20budgets%20between%20each.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slidePipeline",
  "steps": [
    {
      "title": "Branch",
      "body": "Cut the `release` branch on Monday morning."
    },
    {
      "title": "Soak",
      "body": "Run it in staging for two days under replayed traffic."
    },
    {
      "title": "Ship",
      "body": "Roll out by region, watching error budgets between each."
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

![slidePipeline example 3, light](images/slide-pipeline-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slidePipeline example 3, dark](images/slide-pipeline-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
Commit → Build → Test → Stage → Approve → Release

1. **Commit** — A merge to `main` starts the run.
2. **Build** — One image per service, tagged by commit.
3. **Test** — Unit and contract suites run in parallel.
4. **Stage** — The image serves replayed traffic for an hour.
5. **Approve** — An owner signs off on the diff and the graphs.
6. **Release** — Regions update one at a time, watching errors.
```

:::

:::{tab-item} Text
:sync: text

```text
Commit → Build → Test → Stage → Approve → Release
1. Commit — A merge to main starts the run.
2. Build — One image per service, tagged by commit.
3. Test — Unit and contract suites run in parallel.
4. Stage — The image serves replayed traffic for an hour.
5. Approve — An owner signs off on the diff and the graphs.
6. Release — Regions update one at a time, watching errors.
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
        "text": "Commit → Build → Test → Stage → Approve → Release"
      }
    ]
  },
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
                "text": "Commit",
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
                "text": "A merge to "
              },
              {
                "type": "text",
                "text": "main",
                "style": {
                  "code": true
                }
              },
              {
                "type": "text",
                "text": " starts the run."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Build",
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
                "text": "One image per service, tagged by commit."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Test",
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
                "text": "Unit and contract suites run in parallel."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Stage",
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
                "text": "The image serves replayed traffic for an hour."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Approve",
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
                "text": "An owner signs off on the diff and the graphs."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "Release",
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
                "text": "Regions update one at a time, watching errors."
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Commit%20%E2%86%92%20Build%20%E2%86%92%20Test%20%E2%86%92%20Stage%20%E2%86%92%20Approve%20%E2%86%92%20Release%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22ordered%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Commit%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22A%20merge%20to%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22main%22%2C%22style%22%3A%7B%22code%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20starts%20the%20run.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Build%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22One%20image%20per%20service%2C%20tagged%20by%20commit.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Test%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Unit%20and%20contract%20suites%20run%20in%20parallel.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Stage%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20image%20serves%20replayed%20traffic%20for%20an%20hour.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Approve%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22An%20owner%20signs%20off%20on%20the%20diff%20and%20the%20graphs.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Release%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Regions%20update%20one%20at%20a%20time%2C%20watching%20errors.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slidePipeline",
  "steps": [
    {
      "title": "Commit",
      "body": "A merge to `main` starts the run."
    },
    {
      "title": "Build",
      "body": "One image per service, tagged by commit."
    },
    {
      "title": "Test",
      "body": "Unit and contract suites run in parallel."
    },
    {
      "title": "Stage",
      "body": "The image serves replayed traffic for an hour."
    },
    {
      "title": "Approve",
      "body": "An owner signs off on the diff and the graphs."
    },
    {
      "title": "Release",
      "body": "Regions update one at a time, watching errors."
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

![slidePipeline example 4, light](images/slide-pipeline-4-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slidePipeline example 4, dark](images/slide-pipeline-4-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
Basket → Checkout → Payment intent → Card network → Bank

- ● **OUR APP** (Basket → Payment intent): We own the basket to the intent — Every step here ships with the app and is covered by our own tests.
- ○ **PARTNERS** (Card network → Bank): Settlement is theirs — The network and the bank decide timing; we only see the result.
```

:::

:::{tab-item} Text
:sync: text

```text
Basket → Checkout → Payment intent → Card network → Bank
● OUR APP (Basket → Payment intent): We own the basket to the intent — Every step here ships with the app and is covered by our own tests.
○ PARTNERS (Card network → Bank): Settlement is theirs — The network and the bank decide timing; we only see the result.
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
        "text": "Basket → Checkout → Payment intent → Card network → Bank"
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
                "text": "● "
              },
              {
                "type": "text",
                "text": "OUR APP",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " (Basket → Payment intent): "
              },
              {
                "type": "text",
                "text": "We own the basket to the intent"
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "Every step here ships with the app and is covered by our own tests."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "○ "
              },
              {
                "type": "text",
                "text": "PARTNERS",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " (Card network → Bank): "
              },
              {
                "type": "text",
                "text": "Settlement is theirs"
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "The network and the bank decide timing; we only see the result."
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Basket%20%E2%86%92%20Checkout%20%E2%86%92%20Payment%20intent%20%E2%86%92%20Card%20network%20%E2%86%92%20Bank%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22OUR%20APP%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20(Basket%20%E2%86%92%20Payment%20intent)%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22We%20own%20the%20basket%20to%20the%20intent%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Every%20step%20here%20ships%20with%20the%20app%20and%20is%20covered%20by%20our%20own%20tests.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8B%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22PARTNERS%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20(Card%20network%20%E2%86%92%20Bank)%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Settlement%20is%20theirs%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20network%20and%20the%20bank%20decide%20timing%3B%20we%20only%20see%20the%20result.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slidePipeline",
  "steps": [
    {
      "title": "Basket"
    },
    {
      "title": "Checkout"
    },
    {
      "title": "Payment intent"
    },
    {
      "title": "Card network"
    },
    {
      "title": "Bank"
    }
  ],
  "spans": [
    {
      "from": 0,
      "to": 2,
      "tone": "primary",
      "label": "Our app",
      "title": "We own the basket to the intent",
      "body": "Every step here ships with the app and is covered by our own tests."
    },
    {
      "from": 3,
      "to": 4,
      "tone": "accent",
      "label": "Partners",
      "title": "Settlement is theirs",
      "body": "The network and the bank decide timing; we only see the result."
    }
  ]
}
```

:::

::::

### Example 5

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slidePipeline example 5, light](images/slide-pipeline-5-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slidePipeline example 5, dark](images/slide-pipeline-5-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

```markdown
Picker → Packing → Van → Doorstep

- ● **STORE** (Picker → Packing): Picked in aisle order — The route follows the store map.
- ○ **COURIER** (Van): Batched by postcode — Vans leave every forty minutes.
- ● **APP** (Doorstep): Photo on delivery — The customer sees it at once.
```

:::

:::{tab-item} Text
:sync: text

```text
Picker → Packing → Van → Doorstep
● STORE (Picker → Packing): Picked in aisle order — The route follows the store map.
○ COURIER (Van): Batched by postcode — Vans leave every forty minutes.
● APP (Doorstep): Photo on delivery — The customer sees it at once.
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
        "text": "Picker → Packing → Van → Doorstep"
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
                "text": "● "
              },
              {
                "type": "text",
                "text": "STORE",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " (Picker → Packing): "
              },
              {
                "type": "text",
                "text": "Picked in aisle order"
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "The route follows the store map."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "○ "
              },
              {
                "type": "text",
                "text": "COURIER",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " (Van): "
              },
              {
                "type": "text",
                "text": "Batched by postcode"
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "Vans leave every forty minutes."
              }
            ]
          },
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "● "
              },
              {
                "type": "text",
                "text": "APP",
                "style": {
                  "bold": true
                }
              },
              {
                "type": "text",
                "text": " (Doorstep): "
              },
              {
                "type": "text",
                "text": "Photo on delivery"
              },
              {
                "type": "text",
                "text": " — "
              },
              {
                "type": "text",
                "text": "The customer sees it at once."
              }
            ]
          }
        ]
      }
    ]
  }
]
```

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22context%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Picker%20%E2%86%92%20Packing%20%E2%86%92%20Van%20%E2%86%92%20Doorstep%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_list%22%2C%22style%22%3A%22bullet%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22STORE%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20(Picker%20%E2%86%92%20Packing)%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Picked%20in%20aisle%20order%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20route%20follows%20the%20store%20map.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8B%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22COURIER%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20(Van)%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Batched%20by%20postcode%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Vans%20leave%20every%20forty%20minutes.%22%7D%5D%7D%2C%7B%22type%22%3A%22rich_text_section%22%2C%22elements%22%3A%5B%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%E2%97%8F%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22APP%22%2C%22style%22%3A%7B%22bold%22%3Atrue%7D%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20(Doorstep)%3A%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22Photo%20on%20delivery%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22%20%E2%80%94%20%22%7D%2C%7B%22type%22%3A%22text%22%2C%22text%22%3A%22The%20customer%20sees%20it%20at%20once.%22%7D%5D%7D%5D%7D%5D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slidePipeline",
  "steps": [
    {
      "title": "Picker"
    },
    {
      "title": "Packing"
    },
    {
      "title": "Van"
    },
    {
      "title": "Doorstep"
    }
  ],
  "spans": [
    {
      "from": 0,
      "to": 1,
      "tone": "primary",
      "label": "Store",
      "title": "Picked in aisle order",
      "body": "The route follows the store map."
    },
    {
      "from": 2,
      "to": 2,
      "tone": "accent",
      "label": "Courier",
      "title": "Batched by postcode",
      "body": "Vans leave every forty minutes."
    },
    {
      "from": 3,
      "to": 3,
      "tone": "primary",
      "label": "App",
      "title": "Photo on delivery",
      "body": "The customer sees it at once."
    }
  ]
}
```

:::

::::
