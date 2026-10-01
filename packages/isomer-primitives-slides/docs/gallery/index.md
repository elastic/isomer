---
navigation_title: Gallery
description: "Every slides-pack example on every surface: light and dark images, Markdown, text, Slack Block Kit, and the node itself."
---

# Gallery

Every example in each primitive's `examples.ts`, rendered on every surface. Tabs stay in step across a page, so choosing **Markdown** on one example shows Markdown on all of them.

| Primitive | Purpose | Examples |
| --- | --- | --- |
| [`slideAgenda`](slide-agenda.md) | Show the audience every part of the talk and which one they are in, so they know how far along it is. | 3 |
| [`slideBars`](slide-bars.md) | Let the audience compare the size of several amounts of the same kind, and see which one stands out. | 3 |
| [`slideBulletList`](slide-bullet-list.md) | Give the audience a few short, unordered points, marked as neutral, done, or left out. | 4 |
| [`slideClosing`](slide-closing.md) | Send the audience away knowing where to go next: a few addresses, and what to read first for each goal. | 3 |
| [`slideCode`](slide-code.md) | Show the reader real source, with the lines that matter marked, or trace one value from the file that sets it to the file that reads it. | 5 |
| [`slideCommand`](slide-command.md) | Give the audience one shell command they can type or copy and run themselves. | 3 |
| [`slideDefinitions`](slide-definitions.md) | Teach the audience a few terms they need before the rest of the talk makes sense. | 3 |
| [`slideDelta`](slide-delta.md) | Show how far one number moved between two points, and what that change means. | 3 |
| [`slideDiff`](slide-diff.md) | Show the reader exactly what a change did to a piece of source: which lines it added, which it removed, and what stayed. | 3 |
| [`slideFanout`](slide-fanout.md) | Show one thing going to several destinations at once, and what each one does with it. | 3 |
| [`slideFrame`](slide-frame.md) | Hold one 16:9 slide: its content top to bottom and a footer naming the deck, the section, and its address. | 2 |
| [`slideGraph`](slide-graph.md) | Define a small vocabulary and show how its terms relate, so the audience can hold the whole model at once. | 3 |
| [`slideHeading`](slide-heading.md) | State what a content slide proves, as a one-line claim with an optional supporting sentence. | 3 |
| [`slideLanes`](slide-lanes.md) | Contrast two different routes to the same destination, so the audience sees where they differ and where they meet. | 3 |
| [`slideLayers`](slide-layers.md) | Show how a system stacks, layer on layer, and who owns each layer, so the audience knows where a concern lives. | 3 |
| [`slideList`](slide-list.md) | Give the audience a handful of short facts to scan, each optionally keyed by a short term. | 5 |
| [`slideMatrix`](slide-matrix.md) | Let the audience see at a glance which options support which capabilities, and where support is only partial. | 3 |
| [`slidePipeline`](slide-pipeline.md) | Walk the audience through the ordered steps of one process, from what goes in to what comes out. | 5 |
| [`slideQuadrant`](slide-quadrant.md) | Sort a handful of things by two qualities at once, so the audience sees which group each one falls in. | 3 |
| [`slideQuote`](slide-quote.md) | Let a customer, a colleague, or a document make the point in their own words, with the source named. | 3 |
| [`slideRoadmap`](slide-roadmap.md) | Show what is done, what comes next, and what comes after, so the audience knows where the work stands. | 3 |
| [`slideSection`](slide-section.md) | Tell the audience a new part of the deck is starting, and what it will cover. | 3 |
| [`slideSequence`](slide-sequence.md) | Show who says what to whom, in order, so the audience can follow a conversation between systems or people step by step. | 3 |
| [`slideSource`](slide-source.md) | Tell the audience where the numbers or claims on a slide come from, without taking attention from them. | 2 |
| [`slideSplit`](slide-split.md) | Set two things side by side so the reader compares them: two owners, a before and after, or an input and what it becomes. | 4 |
| [`slideStack`](slide-stack.md) | Keep several nodes together as one block, one above the next, where a slot takes a single node. | 3 |
| [`slideStat`](slide-stat.md) | Land one number that proves the slide, with the sentence that says what it means. | 3 |
| [`slideStatement`](slide-statement.md) | Land one claim the audience should remember, set large on a slide of its own. | 2 |
| [`slideStats`](slide-stats.md) | Let the audience compare two to four numbers at a glance, each with a label and one line of context. | 3 |
| [`slideTable`](slide-table.md) | Let the reader compare several items across the same attributes, reading across a row or down a column. | 4 |
| [`slideTerritoryGroup`](slide-territory-group.md) | Show who owns what, so the audience knows which side is responsible for each part. | 2 |
| [`slideTimeline`](slide-timeline.md) | Show how a need or situation changed over dated points, leading up to the one that matters now. | 3 |
| [`slideTitle`](slide-title.md) | Introduce the deck’s subject by name, with its promise and, optionally, a diagram of what it does. | 3 |
| [`slideTranscript`](slide-transcript.md) | Let the reader follow a short exchange between a person, a model, and the program hosting it, turn by turn. | 2 |
| [`slideTree`](slide-tree.md) | Show what is inside a folder and what each file is for, so the audience can find their way around it. | 3 |

## Regenerating

`src/examples/gallery.test.ts` writes these pages and their images. The pages are committed: after changing an example, a renderer, or the theme, run `pnpm docs:gallery -u` and review the diff, since under `CI` a stale page fails the build. The images are not committed; the docs build renders them with `pnpm docs:gallery` before assembling the site.
