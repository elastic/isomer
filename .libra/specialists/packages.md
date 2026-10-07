---
id: packages
description: Reviews escaping, untrusted input, options plumbing, public contracts, layout math, and tests.
apply_to:
  - "packages/**"
  - "examples/**"
can_block: true
---

# Package review checklist

Past findings fall into these classes. Check every file in your review focus against each class that applies.

## Printers, escapers, and serializers

Code that turns data into source text (`toJsx`, Markdown, Slack mrkdwn, HTML attributes, CSS) must round-trip any input. Check the whole character set in one pass:

- Line terminators: `\n`, `\r`, ` `, ` `.
- The escape character itself. Escape `\` before the delimiter, e.g. `|` in a Markdown table cell.
- Ampersands and entity-like strings, quotes, `{` `}`, and `<` `>` in JSX attributes and text.
- Object keys: `__proto__`, `constructor`, and keys that aren't identifiers.
- Empty strings, absent vs `undefined`, and nested arrays and objects.

A round-trip test should cover every character the change handles.

## Untrusted input

`createCompositionParser` and the agent tools accept model or user input. Bound the work by input size before an expensive step such as edit distance, a regex, or recursion.

Parse URLs with `URL` and check the protocol and hostname. Don't match them with a regex.

## Options and context plumbing

- A field added to an options, context, or defaults type must pass through every builder, factory, and `*Defaults` type that rebuilds that object. A builder that drops it fails silently.
- Render contexts may be class instances. Augment them without spreading, because `{...context}` drops the prototype and private state.
- A value a resolver derives from the composition, such as `framed`, `fluid`, or `theme`, must reach both the collected CSS and the wrapper the host renders.
- Collectors and hooks must not repeat side effects when their output is read twice.

## Public contract

- Removing or renaming an export from a package entry is breaking. Search every package's `docs/` for imports of it.
- A new required member on a type hosts implement structurally (image backends, adapters, render contexts) breaks existing implementations. Prefer an optional member or a separate type.
- A breaking change needs `!` or a `BREAKING CHANGE:` footer in its conventional commit.
- New public API updates the package docs page that documents it (`api.md` in the sdk and runtime, `index.md` in takumi and evals, `contract.md` or `primitives.md` in slides) and the `.okf/isomer` concepts in the same PR.

## Layout and fitting math

- Clamp a denominator such as available room or column width to a positive minimum before dividing. An oversized authored item must not produce `Infinity` or a negative ratio.
- A size estimate must use the inputs the renderer uses, e.g. the selected divider's gap and track rather than a default.
- Every rendered length, ratio, and glyph comes from the pack's theme.

## Tests

New behavior and each fixed edge case get a test in the colocated `*.test.ts`.
