---
title: Quick start
description: A working host: one composition rendered to every surface, then a registered view and an agent-authored composition. The vocabulary comes from the reference...
url: https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/quick-start
---

# Quick start
A working host: one composition rendered to every surface, then a registered view and an agent-authored composition. The vocabulary comes from the reference pack, `@elastic/isomer-primitives-slides`, so the steps reach a stylesheet, a frame, the `svg` surface, and a PNG. A host with its own pack swaps the import and changes nothing else.

## 1. Add the dependencies

A runtime needs this package, the SDK, a pack, `zod`, `react`, and `react-dom`. The last two are required even for a text- or Slack-only host: `createIsomerRuntime` always builds the `react` and `html` surfaces, and `html` loads `react-dom/server`.
```jsonc
{
  "dependencies": {
    "@elastic/isomer-primitives-slides": "^0.1.0",
    "@elastic/isomer-runtime": "^0.1.0",
    "@elastic/isomer-sdk": "^0.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^4.4.1"
  }
}
```


## 2. Compose a runtime

Build it once, at module scope. A runtime is a singleton for the process, not a per-request object. `packs` is required; `frames` is required only if you want the `svg` surface, and `slide` is the name this host chooses for the pack's frame.
```ts
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { slideDeckFrame, slidesPack } from '@elastic/isomer-primitives-slides';

export const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
```

The pack ships its own style adapter, so the runtime has CSS without being told. A host composing CSS-bearing packs that declare no adapter supplies `styleAdapter`; see [Runtime](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/runtime).

## 3. Write a composition

A `Composition` says what the answer is, not how it looks. The wire discriminator stays `type: 'view'`. This one is the reference deck's title slide.
```ts
import { type Composition } from '@elastic/isomer-sdk';

const composition: Composition = {
  type: 'view',
  title: 'Title slide',
  body: [
    {
      type: 'slideFrame',
      brand: 'Isomer',
      chapter: '01 · Primitives',
      footer: 'Elastic',
      layout: 'title',
      body: [
        {
          type: 'slideTitle',
          eyebrow: 'Reference pack',
          title: 'One composition, every surface.',
          lede: 'The same spec renders as HTML, markdown, text, Slack, and SVG.',
          size: 'hero',
        },
      ],
    },
  ],
};

runtime.validate(composition);
```


## 4. Render it

Each surface takes the same composition.
```ts
runtime.surfaces.text.render(composition);
runtime.surfaces.markdown.render(composition);

const { html, css, validationErrors } = runtime.surfaces.html.render(composition, {
  theme: 'auto',
});

const { text, blocks, assets } = runtime.surfaces.slack.render(composition, {
  collectAssets: true,
});
```

The `text` surface gives:
```text
TITLE SLIDE

01 · Primitives

Reference pack
One composition, every surface.
The same spec renders as HTML, markdown, text, Slack, and SVG.
```

The `markdown` surface gives:
```markdown
# Title slide

## 01 · Primitives

_Reference pack_

## One composition, every surface.

The same spec renders as HTML, markdown, text, Slack, and SVG.
```

Slack gives a `header` block and one `mrkdwn` section, through the Markdown fallback, because this pack writes no Slack renderer. HTML gives `<section class="isomer framed" role="group" aria-label="Title slide">…</section>` with a `<style>` holding only the rules this slide uses.
Each surface has one validation posture. `html` renders and reports findings on `validationErrors`, because a partial document is still worth showing. `text`, `markdown`, `slack`, and `svg` throw `CompositionValidationError` on an invalid composition by default, because a string, a message, or an image has nowhere to carry findings. `react` never validates. `onValidationError` flips any of them; see [Surfaces](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/surfaces).
React returns bare content by default; `wrapper` adds the same `section` the HTML surface emits, and the stylesheet stays the host's:
```tsx
runtime.surfaces.react.render(composition, {
  context: { onEvent: handleEvent },
  wrapper: true,
});
```

Because the runtime holds a frame, the `svg` surface exists. It stops at a React element and a stylesheet; rasterizing is a host-side step:
```ts
import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';

const { element, css, width, height } = runtime.surfaces.svg.render(composition, {
  theme: 'light',
});

const takumi = createTakumiImageBackend({ fonts });
const png = await takumi.png(runtime.surfaces.svg.render(composition));
```

`fonts` is the host's to register, and the pack's [font notes](/pr-preview/pr-1/slides/styling#fonts-on-the-image-surface) say which families and weights. The result is the PNG at the top of the repository README. See [Frame](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/frame) for how a render picks a frame and its geometry.

## 5. Register a view

A registered view gives a composition a stable id, a typed input, and a builder that fetches.
```ts
import { defineView } from '@elastic/isomer-runtime';
import { z } from '@elastic/isomer-sdk';

runtime.viewRegistry.register(
  defineView({
    id: 'deck.title',
    title: 'Title slide',
    answers: ['Show the title slide', 'Open the deck'],
    input: z.object({ brand: z.string().default('Isomer') }),
    build: async ({ context, input }) => buildTitleSlide(await loadDeck(context), input.brand),
  })
);

const { view, composition, validation } = await runtime.viewRegistry.request(
  'deck.title',
  hostContext,
  { brand: 'Isomer' }
);
```


## 6. Let an agent compose one

```ts
import { formatValidationError } from '@elastic/isomer-sdk';

const { schema, primitives, views } = runtime.getAuthoringContext();
// Hand these to the model, then validate what comes back.

const parsed = runtime.parse(JSON.parse(modelOutput));
if (!parsed.valid) return retryWith(parsed.errors.map(formatValidationError));
render(parsed.composition!);
```


## Next

[Runtime](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/runtime) for the options you skipped, [Surfaces](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/surfaces) for what each render target guarantees, [View registry](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/view-registry) for the trusted path, and [Authoring context](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/authoring-context) for the agent one.