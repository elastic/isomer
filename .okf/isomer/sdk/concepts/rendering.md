---
type: Concept
title: Rendering
description: Envelopes for four of the six surfaces, the HTML renderer, and style adapters.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/rendering.md
tags: [isomer, sdk, rendering]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/rendering.md
    title: Rendering
  - id: envelope
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/render/html/envelope.ts
    title: HTML envelope
  - id: anchors
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/render/anchors.ts
    title: Node anchors
---

# Definition

Renderers return envelopes, not bare strings or elements. The text, markdown, and Slack envelopes take `heading`, which defaults to `true`; `false` leaves out the title and subtitle, and Slack's default fallback `text` with them. Every envelope prints the title and subtitle as text; the markdown one escapes them through `serializeMarkdown`. HTML may run a style adapter and pack `collectStyles` hooks. The SDK ships no adapter for any CSS engine; combining adapters is the runtime's job. `HTMLRenderOptions.scheme` asks an adapter to resolve `light-dark(…)` to one scheme's value; the `snapshot` surface sets it to the render's scheme, since an image has none to resolve against, and the `html` surface leaves it unset for the browser.[^docs]

The Slack envelope always returns a postable payload. It clamps every Slack-limited text in the blocks a renderer returns to its `SLACK_LIMITS` entry, keeping the leading text and an ellipsis and, in `mrkdwn`, never cutting inside a link, mention, or entity; cuts option values, button values, and `action_id`s without an ellipsis and drops an over-long `url`; caps menu options and option groups, matching each initial option to an emitted one; replaces an image whose URL is past `imageUrlChars` with its alt text, a section accessory's in a following `context` block; splits each `rich_text` section, quote, or preformatted element past the section limit (a list is left as is); and escapes the default fallback `text` as `mrkdwn`. It then turns each table past a table limit or the message-wide cell budget into one `rich_text` block that keeps every cell whole, with its styles and blocks, as `heading: cell` rows, applies the section rhythm, splits every `context`, `actions`, or fields section past its element limit into consecutive blocks of its type, and trims blocks past the 50-block budget. The markdown fallback for a primitive without a `slack` renderer reads content built with `md` from its tree through `markdownContentToSlackBlocks`: `rich_text` with literal text and style flags for paragraphs, headings, lists, quotes, and code, `table` blocks for tables, and `divider` blocks for thematic breaks. A hard break is a line break, and a quote is one level: `rich_text_quote` for its text, with a border on a list or code block it holds. A block a rich-text list item cannot hold, such as a table, follows the item on its own. `md.authored` source is parsed where it sits, with the CommonMark and GFM parser that sanitizes it, and its tree is translated the same way. Escapes and character references resolve to their characters, references to their first definition, a footnote prints its `[^label]`, a task item leads with `☑` or `☐`, and raw HTML prints as text. Source past `md.authored`'s parse budget prints as literal paragraphs of the authored characters, though Markdown output carries it escaped. On every path, and in `link`, only an absolute `http`, `https`, or `mailto` URL links, since Slack cannot resolve a relative one; a link prints its label and an image its alt text.[^docs]

HTML returns `{ html, css, js, body, measurement, validationErrors }`. Every script it carries is a function body with `root`, the `.isomer` section, in scope, and each part runs in its own function. `scripts: 'embedded'` (the default) puts one `<script>` in `html` that binds `root` to its parent section. It never runs in a shadow root or when the host inserts `html` itself, so those hosts use `scripts: 'host'`: no `<script>`, and the host calls `runEnhancementScript(js, section)`. An embedded script with no root warns; `runEnhancementScript` throws `ENHANCEMENT_ROOT_MISSING` without a section and warns when the section also carries an embedded script. It uses `new Function`, so a strict CSP needs `'unsafe-eval'`. The render resolves `enhancements` once against every pack's definitions: each renderer's context carries the resolved set as `context.enhancements`, through a view of the adapter's context, and `js` carries each resolved enhancement's script once, after the caller's and the adapter's.[^docs][^envelope]

Node anchors let runtime code find a node's element. A `react` renderer spreads `nodeAnchor(context, node)` on its root, which sets `data-isomer-node` to the node's escaped type. During an HTML render the surface decides whether anchors render, holding the decision in a render-scoped slot rather than writing to the adapter's context: on when a resolved enhancement declares `anchors: true` or a test passes `anchors: true`. Outside one, on the React and `snapshot` surfaces, `context.anchors` decides, which `withNodeAnchors(context)` sets on a view of the context. `withoutAnchors(context)` returns a view of the context, not a copy, that turns anchors off for content that is not a node's `children`. `findNodeElementPairs` pairs nodes and elements by type and order, per occurrence, so a node object used twice pairs twice. An enhancement the host drives has no `script`. `checkLayout(layout, body, walk, surface)` pairs a measured `LayoutBox` tree with nodes by the same rule and returns advisory `LayoutFinding`s: `overflow` past the nearest anchored ancestor's box, or an element inside it marked with `layoutRoom(context)` (`data-isomer-room`), or the canvas at the top level, and `overlap` between siblings under one such room, with nothing inside a scaled box checked. `measureDom(root)` builds that tree from a browser's DOM. `runEnhancementScript`, `findNodeElementPairs`, and `measureDom` run in a browser, so they come from `./react` rather than the root entry.[^docs][^anchors]

Inline text cannot close its own element: CSS has `</style` escaped, and inline JavaScript is parsed so that `</script` and `<!--` are escaped while strings, regular expressions, and tagged-template raw and cooked values and per-site identity are preserved, with legacy HTML-style comments turned into line comments; none of it needs `eval`.[^docs]

URL-bearing fields go through one trust policy. See [URL trust](/sdk/concepts/url-trust.md).

Related: [dispatch](/sdk/concepts/dispatch.md), [packs](/sdk/concepts/packs.md), [style adapters](/runtime/concepts/style-adapters.md).

[^docs]: Rendering


[^envelope]: HTML envelope

[^anchors]: Node anchors
