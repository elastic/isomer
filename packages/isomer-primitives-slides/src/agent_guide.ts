/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAuthoringJsonSchema } from '@elastic/isomer-sdk';
import {
  type AuthoringProfileId,
  type AuthoringPromptContext,
  buildAuthoringPrompt,
} from '@elastic/isomer-sdk/author';

import { slidesPackAuthoring } from './pack_authoring';
import { slideDeckPrimitives } from './registry';

/** How to build a deck from this pack, in the model's voice. */
export const slidesAuthoringGuide = [
  'A deck is an ordered list of compositions, one per slide. Each is `{ "type": "view", "title": "<a short name for the slide>", "body": [<one slideFrame>] }`. Everything on the slide goes inside that frame\'s `body`. The `title` names the slide in navigation and is not drawn; the slide\'s words, its claim included, go in the frame.',
  'There are four kinds of slide:',
  '- Title (first): `tone: "inverse"`, body `[slideTitle]`, usually with a `slideFanout` as its `aside`.',
  '- Section divider: `tone: "inverse"`, body `[slideSection]` listing the titles of the slides in that section.',
  '- Content: `tone: "page"`, body starts with `slideHeading`, then one primitive that carries the idea. Put two things side by side with `slideSplit`. A `slideStat` band may follow as a closing proof point.',
  '- Closing (last): `tone: "inverse"`, body `[slideClosing]`.',
  'The heading title is the slide\'s claim written as a sentence ("Refunds settle in two days, not five"), not a topic label ("Refunds"). The lede supports it in one or two sentences.',
  "Frame footers carry the deck's identity: the same `brand` and `url` on every slide, and `chapterNumber` plus `chapter` naming the section the slide belongs to. The title slide has no chapter.",
  'Color means something. `primary` marks your product, the runtime, or the current item; `pink` marks the host or another party. Nothing else is colored, so use tones only where that distinction is the point.',
  "Slides render at a fixed 1920×1080 and nothing is set below 24px, so space is scarce: one idea per slide, short phrases, and the limits in each primitive's schema are ceilings, not targets.",
  'Headings, stats, timelines, pipelines, columns, definitions, graphs, and the title, section, and closing slides size their type to their text: with `size` left out they pick the largest of `l`, `m`, and `s` that fits, allowing for how much room the heading leaves. If a render still runs past the footer, set `size: "s"`, then shorten the copy; `s` is the smallest step, so after it only shorter text helps.',
  'The same slide also renders as text, Markdown, and Slack, where every string you write appears in full. Write strings that read well on their own.',
  "Never invent numbers or screenshots. Leave a stat's `value` out, or give a `slideRender` only its `slide` reference, and the slide shows a labeled placeholder instead.",
].join('\n\n');

/** Hard constraints every slide must meet. */
export const slidesAuthoringRules: readonly string[] = [
  "Each composition's `body` is exactly one `slideFrame`. Frames never nest.",
  'Use only the primitives in the catalog, with only the fields their schema lists.',
  'Every content slide opens with `slideHeading`; title, section, and closing slides use `tone: "inverse"` and no heading.',
  'Keep `brand` and `url` identical across the deck. `url` is absolute, scheme included: `https://example.com`, never `example.com`.',
  'Tones are `primary` or `pink`; there are no others.',
  'A `slideWindow` cannot hold another `slideWindow`, and an embedded render cannot embed another render.',
];

const slideAuthoringIntro =
  'You write slides. Each slide is a single JSON composition built only from the primitives in the catalog below, and a deck is an ordered list of them. Check every slide against the JSON Schema before you send it.';

let packSchema: Record<string, unknown> | undefined;

/**
 * This pack's authoring prompt. A host that composes other packs passes its
 * runtime's `getAuthoringContext()` `schema` and `primitives` instead.
 */
export const buildSlidesAuthoringPrompt = (
  profile: AuthoringProfileId = 'compose-from-primitives',
  context: Partial<AuthoringPromptContext> = {}
): string => {
  packSchema ??= buildAuthoringJsonSchema(
    slideDeckPrimitives,
    slidesPackAuthoring
  );
  return buildAuthoringPrompt(profile, {
    heading: '# Slide authoring',
    intro: slideAuthoringIntro,
    guide: slidesAuthoringGuide,
    rules: slidesAuthoringRules.map((rule) => `- ${rule}`).join('\n'),
    schema: packSchema,
    primitives: slideDeckPrimitives.map(({ catalog }) => catalog),
    examples: [],
    ...context,
  });
};
