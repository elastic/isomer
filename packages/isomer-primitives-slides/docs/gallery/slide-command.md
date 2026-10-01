---
navigation_title: slideCommand
---

# `slideCommand`

Give the audience one shell command they can type or copy and run themselves.

## Use when

- The slide’s point is what to run: an install, a setup step, a way to try something.
- A short sequence of steps, each one command, with a label saying what each does.

## Avoid when

- The command spans several lines, or you are showing source rather than something to run; use slideCode.

## Examples

Each image draws the example in a preview slide, as `previewSlide` frames it. The string surfaces render the node alone.

### Example 1 (catalog)

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideCommand example 1, light](images/slide-command-1-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideCommand example 1, dark](images/slide-command-1-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
**START THE LOCAL STORE**

```sh
docker compose up --detach inventory
```
````

:::

:::{tab-item} Text
:sync: text

```text
START THE LOCAL STORE
$ docker compose up --detach inventory
```

:::

:::{tab-item} Slack
:sync: slack

````json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*START THE LOCAL STORE*\n```\ndocker compose up --detach inventory\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*START%20THE%20LOCAL%20STORE*%5Cn%60%60%60%5Cndocker%20compose%20up%20--detach%20inventory%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideCommand",
  "label": "Start the local store",
  "command": "docker compose up --detach inventory"
}
```

:::

::::

### Example 2

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideCommand example 2, light](images/slide-command-2-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideCommand example 2, dark](images/slide-command-2-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
```sh
REGION=eu-west-1 npm run refunds:replay -- --since 2026-03-01
```
````

:::

:::{tab-item} Text
:sync: text

```text
$ REGION=eu-west-1 npm run refunds:replay -- --since 2026-03-01
```

:::

:::{tab-item} Slack
:sync: slack

````json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "```\nREGION=eu-west-1 npm run refunds:replay -- --since 2026-03-01\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%60%60%60%5CnREGION%3Deu-west-1%20npm%20run%20refunds%3Areplay%20--%20--since%202026-03-01%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideCommand",
  "command": "REGION=eu-west-1 npm run refunds:replay -- --since 2026-03-01",
  "highlightPrefix": "REGION=eu-west-1"
}
```

:::

::::

### Example 3

::::{tab-set}
:group: surface

:::{tab-item} Light
:sync: light

![slideCommand example 3, light](images/slide-command-3-light.png)

:::

:::{tab-item} Dark
:sync: dark

![slideCommand example 3, dark](images/slide-command-3-dark.png)

:::

:::{tab-item} Markdown
:sync: markdown

````markdown
**EXPORT LAST MONTH’S REFUNDS**

```sh
pg_dump --table=refunds --data-only --column-inserts --file=refunds.sql "$LEDGER_DB"
```
````

:::

:::{tab-item} Text
:sync: text

```text
EXPORT LAST MONTH’S REFUNDS
$ pg_dump --table=refunds --data-only --column-inserts --file=refunds.sql "$LEDGER_DB"
```

:::

:::{tab-item} Slack
:sync: slack

````json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*EXPORT LAST MONTH’S REFUNDS*\n```\npg_dump --table=refunds --data-only --column-inserts --file=refunds.sql \"$LEDGER_DB\"\n```"
    }
  }
]
````

[Open in Block Kit Builder](https://app.slack.com/block-kit-builder#%7B%22blocks%22%3A%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*EXPORT%20LAST%20MONTH%E2%80%99S%20REFUNDS*%5Cn%60%60%60%5Cnpg_dump%20--table%3Drefunds%20--data-only%20--column-inserts%20--file%3Drefunds.sql%20%5C%22%24LEDGER_DB%5C%22%5Cn%60%60%60%22%7D%7D%5D%7D)

:::

:::{tab-item} Node
:sync: node

```json
{
  "type": "slideCommand",
  "label": "Export last month’s refunds",
  "command": "pg_dump --table=refunds --data-only --column-inserts --file=refunds.sql \"$LEDGER_DB\""
}
```

:::

::::
