# Copy buttons

`slideCopy` adds a Copy button to each `slideCommand`, which copies the command to the clipboard. It is a progressive enhancement: without it, the command reads the same and the audience selects the text by hand.

## What it touches

| Primitive | Gets |
| --- | --- |
| `slideCommand` | A Copy button at the end of its panel, copying the `code` element's text |

No renderer draws the button. The enhancement's script adds it wherever the script runs: the HTML surface with `SLIDE_COPY` requested, or the React surface given `slideCopyEnhancement` and a wrapper. The image, text, Markdown, and Slack surfaces never show one. The script adds nothing without `navigator.clipboard`, and never adds a second button to a panel that has one. The button is a native `<button type="button">` whose text is its label, so it takes focus and responds to Enter and Space.

The panel's stylesheet styles the button by `COPY_BUTTON_ATTRIBUTE` (`data-slide-copy`), because a script-made element carries no class names. The label and the button's lengths come from the theme's `command.copy` group, and the command's line length already leaves room for the button.

## Requesting it from a host

Request `slideCopy` when rendering the HTML surface, then run the render's script against its section:

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

A React host passes the definition instead of the id:

```tsx
runtime.surfaces.react.render(composition, {
  wrapper: true,
  enhancements: [slideCopyEnhancement],
});
```

## How the pack emits it

`src/pack.ts` lists `slideCopyEnhancement` in the pack's `enhancements`, and that is all a pack does: the HTML render resolves what the host requested against every pack's enhancements, hands every renderer the set as `context.enhancements`, and emits each resolved enhancement's script once. The style adapter plays no part.
