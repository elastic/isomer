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

/** In the model's voice. */
export const slidesAuthoringGuide = [
  'A deck is an ordered list of compositions, one per slide. Each is `{ "type": "view", "title": "<a short name for the slide>", "body": [<one slideFrame>] }`. Everything on the slide goes inside that frame\'s `body`. The `title` names the slide in navigation and is not drawn; the slide\'s words, its claim included, go in the frame.',
  'There are two kinds of slide:',
  '- Title (first): `tone: "inverse"`, body `[slideTitle]`, optionally with one compact node as its `aside`.',
  '- Content: `tone: "page"`, body starts with `slideHeading`, then one primitive that carries the idea. Put two things side by side with `slideSplit`; give it `ratio: "aside"` and `divider: "hairline"` for a main idea with a narrow column of notes.',
  'The heading title is the slide\'s claim written as a sentence ("Refunds settle in two days, not five"), not a topic label ("Refunds"). The lede supports it in one or two sentences. A title that needs two lines breaks near its middle, since both lines balance, so keep a strong phrase short enough to stay on one of them.',
  "Frame footers carry the deck's identity: the same `brand` and `url` on every slide, and `sectionNumber` plus `section` naming the section the slide belongs to. The title slide has no section; every other slide has one. A deck with one section still numbers it `01` and names it. The theme draws the Isomer mark beside the footer and on the title slide; set `logo: false` on every frame unless the deck is about Isomer.",
  'Tones are theme roles, not colors. `primary` marks what is yours or in focus: your product, the runtime, or the current item. `accent` marks the host or another party where ownership is the point, as on a diagram of who runs what. Everything else is neutral, so use a tone only where one of those distinctions matters.',
  "Slides render at a fixed 1920×1080 and nothing is set below 24px, so space is scarce: one idea per slide, short phrases, and the limits in each primitive's schema are ceilings, not targets.",
  'Headings, the title slide, and every primitive with a `size` field size their type to their text: with `size` left out they pick the largest of `l`, `m`, and `s` that fits. The pick is an estimate: if a render still runs past the footer, set `size` one step below what it drew, then shorten the copy. `s` is the smallest step, so after it only shorter text helps.',
  'The same slide also renders as text, Markdown, and Slack, where every string you write appears in full. Write strings that read well on their own, with typographic punctuation: ’ for apostrophes, “ ” for quotes, – for ranges, and — for a break. Straight marks render as typed.',
  "Fields whose description says so accept inline marks: `` `code` `` for identifiers and commands, and `**strong**` for the words that carry a sentence. Strong takes the `primary` tone where the text is already bold or display-sized, such as headings and taglines, and is bold in the text's own tone in regular copy. So never strong-mark another party's name in display text; give it the `accent` tone where the primitive takes one. Use marks sparingly.",
  'Never invent numbers or screenshots.',
].join('\n\n');

export const slidesAuthoringRules: readonly string[] = [
  "Each composition's `body` is exactly one `slideFrame`. Frames never nest.",
  'Use only the primitives in the catalog, with only the fields their schema lists.',
  'Every page-tone slide opens with `slideHeading`; the title slide uses `tone: "inverse"` and no heading.',
  'Keep `brand`, `url`, and `logo` identical across the deck. `url` is absolute, scheme included: `https://example.com`, never `example.com`.',
  'Tones are `primary` or `accent`; there are no others.',
];

const slideAuthoringIntro =
  'You write slides. Each slide is a single JSON composition built only from the primitives in the catalog below, and a deck is an ordered list of them. Check every slide against the JSON Schema before you send it.';

let packSchema: Record<string, unknown> | undefined;

/** This pack's authoring prompt; a multi-pack host passes its runtime's `getAuthoringContext()` output instead. */
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
