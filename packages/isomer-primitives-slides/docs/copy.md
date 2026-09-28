# Copy buttons

`slideCopy` adds a Copy button to each `slideCommand`, which copies the command's text to the clipboard. It is a progressive enhancement: without it, the command reads the same and the audience selects the text by hand.

## What it touches

| Primitive | Gets |
| --- | --- |
| `slideCommand` | a Copy button at the end of its panel, copying the `code` element's text |

The button is added by the enhancement's script, never drawn by a renderer, so it exists only where a script runs: the HTML surface with the enhancement requested. The React, image, text, Markdown, and Slack surfaces draw no button. The script adds nothing without `navigator.clipboard`, and never adds a second button to a panel that has one.

The panel's stylesheet styles the button by its `COPY_BUTTON_ATTRIBUTE` (`data-slide-copy`), because a script-made element carries no class names. The label and the button's lengths come from the theme's `command.copy` group, and the command's line length already leaves room for the button.

## Requesting it from a host

Request the `slideCopy` enhancement when rendering the HTML surface, then run the render's script against its section:

```ts
import { SLIDE_COPY } from '@elastic/isomer-primitives-slides';
import { runEnhancementScript } from '@elastic/isomer-sdk';

const { html, css, js } = runtime.surfaces.html.render(composition, {
  enhancements: [SLIDE_COPY],
  scripts: 'host',
});
// Insert `html` and `css`, then:
runEnhancementScript(js, section);
```

A composition with no `slideCommand` ships no script, and the enhancement adds [node anchors](../../isomer-sdk/docs/rendering.md#node-anchors) only when it applies, which is how the script finds each command. With `scripts: 'embedded'` the script runs from a `<script>` tag instead; [Who runs the script](../../isomer-sdk/docs/rendering.md#who-runs-the-script) covers which hosts can use that.

The Isomer deck viewer's HTML stage (`examples/deck/src/viewer/shadow_html.tsx`) is the reference host.

## How the pack emits it

`src/pack.ts` wraps the Distillate adapter in `withEnhancements` with the pack's own enhancement ids, so the adapter sets `context.enhancements` and emits the scripts of this pack's enhancements, and no other pack's. A pack that copies this one keeps that wrapper and passes its own ids.
