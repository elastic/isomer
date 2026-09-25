/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runtime } from '@elastic/isomer-deck/runtime';
import type { IsomerTool, IsomerToolResult } from '@elastic/isomer-mcp/tools';
import { checkComposition } from '@elastic/isomer-mcp/tools';
import { slideDeckFrame } from '@elastic/isomer-primitives-slides';
import type { Composition } from '@elastic/isomer-sdk';
import { z, type ZodObject } from 'zod';

import { resolveDeck, unresolvedReference } from './resolve';
import type { Deck, DeckStore } from './store';

/** Renders one slide, its references resolved, to PNG bytes. */
export type SlidePng = (
  composition: Composition,
  theme: 'light' | 'dark'
) => Promise<Uint8Array>;

const text = (value: string, isError = false): IsomerToolResult =>
  isError
    ? { content: [{ type: 'text', text: value }], isError }
    : { content: [{ type: 'text', text: value }] };

const json = (value: unknown, isError = false): IsomerToolResult =>
  text(JSON.stringify(value, null, 2), isError);

const tool = <TInput extends ZodObject>(
  definition: IsomerTool<TInput>
): IsomerTool => definition;

const deckId = z
  .string()
  .min(1)
  .describe('The id `deck_create` or `deck_list` returned.');
const index = z.number().int().min(0).describe('Zero-based slide position.');
const composition = z
  .looseObject({})
  .describe(
    'One slide: `{ "type": "view", "title": "...", "body": [<one slideFrame>] }`. Read `isomer_authoring_guide` first. In a `slideRender`, `slide` is another slide\'s index in this deck, as a string; write the referenced slide first. Inserting, moving, or removing slides shifts indexes, and a reference that no longer resolves draws a placeholder.'
  );

const outline = ({ id, title, slides }: Deck) => ({
  deckId: id,
  title,
  slides: slides.map((slide, position) => ({
    index: position,
    title: slide.title ?? '(untitled)',
  })),
});

/** The studio's deck tools, over `store`. Slides are validated before they are stored. */
export const createDeckTools = (
  store: DeckStore,
  png: SlidePng,
  viewerUrl: (deckId: string) => string
): IsomerTool[] => {
  const check = (value: unknown) =>
    checkComposition(runtime, slideDeckFrame, value);

  const storeSlide = (
    id: string,
    at: number,
    value: unknown,
    place: (slides: Composition[], slide: Composition) => void
  ): IsomerToolResult => {
    const deck = store.get(id);
    if (!deck) {
      return text(
        `No deck "${id}". Call deck_list to see the decks that exist.`,
        true
      );
    }
    if (at > deck.slides.length) {
      return text(
        `Index ${at} is past the end; the deck has ${deck.slides.length} slides, so the next free index is ${deck.slides.length}.`,
        true
      );
    }
    const result = check(value);
    if (!result.valid || !result.composition) {
      return json({ stored: false, errors: result.errors }, true);
    }
    const slide = result.composition;
    const candidate = [...deck.slides];
    place(candidate, slide);
    const reference = unresolvedReference(candidate);
    if (reference) {
      return json({ stored: false, errors: [reference] }, true);
    }
    const updated = store.update(id, (slides) => {
      place(slides, slide);
      return slides;
    });
    return json({
      stored: true,
      index: at,
      warnings: result.warnings,
      deck: outline(updated),
      viewer: viewerUrl(id),
    });
  };

  return [
    tool({
      name: 'deck_create',
      title: 'Create a deck',
      description:
        'Starts an empty deck and returns its id. Add slides with deck_set_slide. The user can watch the deck at the returned viewer URL.',
      inputSchema: z.object({
        title: z.string().min(1).describe('What the deck is about.'),
      }),
      handler: ({ title }) => {
        const { id } = store.create(title);
        return Promise.resolve(
          json({ deckId: id, title, viewer: viewerUrl(id) })
        );
      },
    }),
    tool({
      name: 'deck_list',
      title: 'List decks',
      description: 'Every deck in the studio, newest first, with slide counts.',
      inputSchema: z.object({}),
      handler: () => Promise.resolve(json(store.list())),
    }),
    tool({
      name: 'deck_get',
      title: 'Read a deck',
      description:
        "A deck's slides in order, as the compositions you stored. Read it before revising a deck you did not just write.",
      inputSchema: z.object({ deckId }),
      handler: ({ deckId: id }) => {
        const deck = store.get(id);
        return Promise.resolve(
          deck
            ? json({ ...outline(deck), compositions: deck.slides })
            : text(`No deck "${id}".`, true)
        );
      },
    }),
    tool({
      name: 'deck_set_slide',
      title: 'Write a slide',
      description:
        'Validates one slide and stores it at `index`, replacing what is there; `index` equal to the slide count appends. An invalid slide is not stored, and the errors say what to fix.',
      inputSchema: z.object({ deckId, index, composition }),
      handler: ({ deckId: id, index: at, composition: value }) =>
        Promise.resolve(
          storeSlide(id, at, value, (slides, slide) => {
            slides[at] = slide;
          })
        ),
    }),
    tool({
      name: 'deck_insert_slide',
      title: 'Insert a slide',
      description:
        'Validates one slide and inserts it before `index`, shifting later slides down.',
      inputSchema: z.object({ deckId, index, composition }),
      handler: ({ deckId: id, index: at, composition: value }) =>
        Promise.resolve(
          storeSlide(id, at, value, (slides, slide) => {
            slides.splice(at, 0, slide);
          })
        ),
    }),
    tool({
      name: 'deck_remove_slide',
      title: 'Remove a slide',
      description: 'Removes the slide at `index`.',
      inputSchema: z.object({ deckId, index }),
      handler: ({ deckId: id, index: at }) => {
        const deck = store.get(id);
        return Promise.resolve(
          !deck || at >= deck.slides.length
            ? text(`No slide ${at} in deck "${id}".`, true)
            : json(
                outline(
                  store.update(id, (slides) =>
                    slides.filter((_, i) => i !== at)
                  )
                )
              )
        );
      },
    }),
    tool({
      name: 'deck_move_slide',
      title: 'Move a slide',
      description: 'Moves the slide at `from` to `to`.',
      inputSchema: z.object({ deckId, from: index, to: index }),
      handler: ({ deckId: id, from, to }) => {
        const deck = store.get(id);
        const count = deck?.slides.length ?? 0;
        return Promise.resolve(
          from >= count || to >= count
            ? text(`Both positions must be below ${count}.`, true)
            : json(
                outline(
                  store.update(id, (slides) => {
                    const [moved] = slides.splice(from, 1);
                    slides.splice(to, 0, moved!);
                    return slides;
                  })
                )
              )
        );
      },
    }),
    tool({
      name: 'deck_render_slide',
      title: 'Look at a slide',
      description:
        'Renders a stored slide to PNG so you can check it the way the audience will see it: overflow, crowding, and balance. Fix what you see with deck_set_slide.',
      inputSchema: z.object({
        deckId,
        index,
        theme: z
          .enum(['light', 'dark'])
          .optional()
          .describe('Defaults to light.'),
      }),
      handler: async ({ deckId: id, index: at, theme = 'light' }) => {
        const deck = store.get(id);
        const slide = deck ? resolveDeck(deck).slides[at] : undefined;
        if (!slide) {
          return text(`No slide ${at} in deck "${id}".`, true);
        }
        const bytes = await png(slide, theme);
        const { errors } = check(deck?.slides[at]);
        return {
          content: [
            {
              type: 'image',
              data: Buffer.from(bytes).toString('base64'),
              mimeType: 'image/png',
            },
            ...(errors.length > 0
              ? [
                  {
                    type: 'text' as const,
                    text: `This slide no longer validates; rewrite it with deck_set_slide.\n${errors.join('\n')}`,
                  },
                ]
              : []),
          ],
        };
      },
    }),
  ];
};
