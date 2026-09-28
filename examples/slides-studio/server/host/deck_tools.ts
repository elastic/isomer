/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IsomerTool,
  IsomerToolResult,
  IsomerToolsRuntime,
} from '@elastic/isomer-agent-tools';
import {
  checkComposition,
  imageResult,
  jsonResult as json,
  textResult as text,
} from '@elastic/isomer-agent-tools';
import {
  slideAuthoringNotes,
  slideDeckFrame,
  type SlideOverflow,
  type SlideOverlap,
} from '@elastic/isomer-primitives-slides';
import type { Composition } from '@elastic/isomer-sdk';
import { z, type ZodObject } from 'zod';

import type { Deck, DeckStore } from './deck';
import { resolveDeck, unresolvedReference } from './resolve';

/** Renders one slide, its references resolved, to PNG bytes. */
export type SlidePng = (
  composition: Composition,
  theme: 'light' | 'dark'
) => Promise<Uint8Array>;

/** Where one slide, its references resolved, runs past its body or draws nodes over each other, as the PNG lays it out. */
export type SlideLayoutCheck = (composition: Composition) => Promise<{
  overflow: SlideOverflow | undefined;
  overlaps: SlideOverlap[];
}>;

const bodyTypes = (composition: Composition): string[] => {
  const [frame] = composition.body as { body?: { type?: unknown }[] }[];
  return (frame?.body ?? []).map(({ type }) => String(type));
};

type SchemaDefs = Record<string, { properties?: Record<string, unknown> }>;

const named = (index: number, types: readonly string[]): string =>
  `${index} (${types[index] ?? '?'})`;

/** What to change on a crowded slide: `size` where a body node takes one, else the copy. */
const crowdedFix = (
  defs: SchemaDefs,
  types: readonly string[],
  last: string
): string => {
  const sized = types.flatMap((type, index) =>
    defs[type]?.properties?.size === undefined ? [] : [named(index, types)]
  );
  return sized.length > 0
    ? `Set \`size: "s"\` on body node ${sized.join(', ')}, shorten the copy, or ${last}.`
    : `No node here takes \`size\`, so shorten the copy or ${last}.`;
};

const overlapText = (
  defs: SchemaDefs,
  { nodes: [first, second], by }: SlideOverlap,
  types: readonly string[]
): string =>
  `Body nodes ${named(first, types)} and ${named(second, types)} are drawn over each other by ${by}px: the slide is too full, so a node was squeezed. ${crowdedFix(defs, types, 'move one to its own slide')}`;

const overflowText = (
  defs: SchemaDefs,
  overflow: SlideOverflow,
  types: readonly string[]
): string => {
  const sides = (['bottom', 'right', 'top', 'left'] as const)
    .filter((side) => overflow[side] > 0)
    .map((side) => `${overflow[side]}px past the ${side}`)
    .join(', ');
  const nodes = overflow.nodes.map((index) => named(index, types)).join(', ');
  return `Content runs past the slide's body: ${sides}, from body node ${nodes}. ${crowdedFix(defs, types, 'split the slide')} Text cut off inside an embedded render's panel counts too.`;
};

const slideLink = /^\?slide=(\d+)$/;

const QUOTED_MAX_LENGTH = 80;

/** Model input echoed as a JSON string on one line, cut to {@link QUOTED_MAX_LENGTH} characters. */
const quoted = (value: string): string =>
  oneLineJson(
    value.length > QUOTED_MAX_LENGTH
      ? `${value.slice(0, QUOTED_MAX_LENGTH)}…`
      : value
  );

/** `JSON.stringify`, with the line separators it leaves raw escaped too. */
const oneLineJson = (value: unknown): string =>
  JSON.stringify(value).replace(
    /[\u2028\u2029]/g,
    (separator) => `\\u${separator.charCodeAt(0).toString(16)}`
  );

const noDeck = (id: string) =>
  text(
    `No deck ${quoted(id)}. Call deck_list to see the decks that exist.`,
    true
  );

/** What a tool reports for a thrown value, whatever was thrown. */
const errorMessage = (error: unknown): string => {
  try {
    const { message } = (error ?? {}) as { message?: unknown };
    return typeof message === 'string' ? message : String(error);
  } catch {
    return 'The tool failed with a value that has no message.';
  }
};

/** The pack's authoring rules, and a reminder that the Isomer mark is drawn unless the frame says not to. */
const authoringNotes = (slide: Composition): string[] => {
  const [frame] = slide.body as { logo?: boolean }[];
  return [
    ...slideAuthoringNotes(slide),
    ...(frame?.logo === undefined
      ? [
          'The Isomer mark is drawn on this slide; set `logo: false` on every frame unless the deck is about Isomer, or `logo: true` to keep it.',
        ]
      : []),
  ];
};

/** A note on one section link, with the index of the slide it opens. */
interface LinkNote {
  target: number;
  note: string;
}

/** Section links that point past the deck, or at a slide whose title is not the line they sit on. */
const sectionLinkNotes = (
  slide: Composition,
  slides: readonly Composition[]
): LinkNote[] => {
  const [frame] = slide.body as { body?: unknown[] }[];
  return (frame?.body ?? []).flatMap((node) => {
    const {
      type,
      contents = [],
      hrefs = [],
    } = node as {
      type?: unknown;
      contents?: string[];
      hrefs?: string[];
    };
    if (type !== 'slideSection') {
      return [];
    }
    return hrefs.flatMap((href, line) => {
      const [, at] = slideLink.exec(href) ?? [];
      if (at === undefined) {
        return [];
      }
      const target = Number(at);
      const opened = slides[target];
      if (opened === undefined) {
        return [
          {
            target,
            note: `Section link \`${href}\` points past the deck's ${slides.length} slides; that is expected until the slide is written, so render this divider again once it is.`,
          },
        ];
      }
      return opened.title === contents[line]
        ? []
        : [
            {
              target,
              note: `Section link \`${href}\` sits on ${quoted(contents[line] ?? '')} but opens slide ${at}, titled ${quoted(opened.title ?? '')}.`,
            },
          ];
    });
  });
};

/** Every link in `slides` whose target is in `[from, to]`, each named by the slide it sits on, less the slide at `skip`. */
const linkWarnings = (
  slides: readonly Composition[],
  [from, to]: readonly [number, number],
  skip?: number
): string[] =>
  slides.flatMap((slide, index) =>
    index === skip
      ? []
      : sectionLinkNotes(slide, slides)
          .filter(({ target }) => target >= from && target <= to)
          .map(({ note }) => `Slide ${index}: ${note}`)
  );

/** `definition` with a handler that resolves to a failed call rather than throwing or rejecting. */
const tool = <TInput extends ZodObject>(
  definition: IsomerTool<TInput>
): IsomerTool => {
  const guarded: IsomerTool<TInput> = {
    ...definition,
    handler: async (input) => {
      try {
        return await definition.handler(input);
      } catch (error) {
        return text(errorMessage(error), true);
      }
    },
  };
  return guarded;
};

const deckId = z
  .string()
  .min(1)
  .describe('The id `deck_create` or `deck_list` returned.');
const index = z.number().int().min(0).describe('Zero-based slide position.');
const composition = z
  .looseObject({})
  .describe(
    'One slide: `{ "type": "view", "title": "...", "body": [<one slideFrame>] }`. Read `isomer_authoring_guide` first, and `isomer_describe_primitives` for the primitives you use. In a `slideRender`, `slide` is another slide\'s index in this deck, as a string; write the referenced slide first. Inserting, moving, or removing slides shifts indexes, and a reference that no longer resolves draws a placeholder.'
  );

const outline = ({ id, title, slides }: Deck) => ({
  deckId: id,
  title,
  slides: slides.map((slide, position) => ({
    index: position,
    title: slide.title ?? '(untitled)',
  })),
});

/** Options for {@link createDeckTools}. */
export interface DeckToolsOptions {
  runtime: IsomerToolsRuntime;
  store: DeckStore;
  png: SlidePng;
  layoutOf: SlideLayoutCheck;
  viewerUrl: (deckId: string) => string;
}

/** The studio's deck tools, over `store`. Slides are validated before they are stored. */
export const createDeckTools = ({
  runtime,
  store,
  png,
  layoutOf,
  viewerUrl,
}: DeckToolsOptions): IsomerTool[] => {
  const { $defs: defs = {} } = runtime.getAuthoringContext().schema as {
    $defs?: SchemaDefs;
  };
  const check = (value: unknown) =>
    checkComposition(runtime, slideDeckFrame, value);
  // A render joins two slides that each validate into one that may not, e.g. past the nesting bound.
  const filledErrors = (deck: Deck): string[] =>
    resolveDeck(deck).slides.flatMap((composition, index) => {
      const { errors } = check(composition);
      return errors.length > 0 && check(deck.slides[index]).valid
        ? errors.map(
            (error) => `Slide ${index}, with its renders filled: ${error}`
          )
        : [];
    });

  /** Stores `value` at `at` with `place`; `shifted` is the range of indexes whose slide changes. */
  const storeSlide = (
    id: string,
    at: number,
    value: unknown,
    place: (slides: Composition[], slide: Composition) => void,
    shifted: readonly [number, number]
  ): IsomerToolResult => {
    const deck = store.get(id);
    if (!deck) {
      return noDeck(id);
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
    const filled = filledErrors({ ...deck, slides: candidate });
    if (filled.length > 0) {
      return json({ stored: false, errors: filled }, true);
    }
    const updated = store.update(id, (slides) => {
      place(slides, slide);
      return slides;
    });
    // Its own links past the deck are expected while the deck is written in order.
    const own = sectionLinkNotes(slide, updated.slides)
      .filter(({ target }) => target < updated.slides.length)
      .map(({ note }) => `Slide ${at}: ${note}`);
    return json({
      stored: true,
      index: at,
      warnings: [
        ...result.warnings,
        ...authoringNotes(slide),
        ...own,
        ...linkWarnings(updated.slides, shifted, at),
      ],
      deck: outline(updated),
      viewer: viewerUrl(id),
    });
  };

  return [
    tool({
      name: 'deck_create',
      title: 'Create a deck',
      description:
        'Starts an empty deck and returns its id. Add slides with deck_set_slide. `viewer` shows every slide as you write it; give the user that. `present` shows one slide at a time, and is the page a relative `?slide=<n>` link opens.',
      inputSchema: z.object({
        title: z.string().min(1).describe('What the deck is about.'),
      }),
      handler: ({ title }) => {
        const { id } = store.create(title);
        return Promise.resolve(
          json({
            deckId: id,
            title,
            viewer: viewerUrl(id),
            present: `${viewerUrl(id)}/present`,
          })
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
            : noDeck(id)
        );
      },
    }),
    tool({
      name: 'deck_set_slide',
      title: 'Write a slide',
      description:
        "Validates one slide and stores it at `index`, replacing what is there; `index` equal to the slide count appends. An invalid slide is not stored, and the errors say what to fix. `warnings` covers the stored slide, including its own section links, and every divider whose link to it no longer matches its title; the stored slide's links past the deck's end are checked when it is rendered.",
      inputSchema: z.object({ deckId, index, composition }),
      handler: ({ deckId: id, index: at, composition: value }) =>
        Promise.resolve(
          storeSlide(
            id,
            at,
            value,
            (slides, slide) => {
              slides[at] = slide;
            },
            [at, at]
          )
        ),
    }),
    tool({
      name: 'deck_insert_slide',
      title: 'Insert a slide',
      description:
        'Validates one slide and inserts it before `index`, shifting later slides down. `warnings` names every section link into the shifted slides that no longer matches.',
      inputSchema: z.object({ deckId, index, composition }),
      handler: ({ deckId: id, index: at, composition: value }) =>
        Promise.resolve(
          storeSlide(
            id,
            at,
            value,
            (slides, slide) => {
              slides.splice(at, 0, slide);
            },
            [at, Number.POSITIVE_INFINITY]
          )
        ),
    }),
    tool({
      name: 'deck_remove_slide',
      title: 'Remove a slide',
      description:
        'Removes the slide at `index`. `warnings` names every section link into the shifted slides that no longer matches or now points past the deck.',
      inputSchema: z.object({ deckId, index }),
      handler: ({ deckId: id, index: at }) => {
        const deck = store.get(id);
        if (!deck) {
          return Promise.resolve(noDeck(id));
        }
        if (at >= deck.slides.length) {
          return Promise.resolve(
            text(`No slide ${at}; the deck has ${deck.slides.length}.`, true)
          );
        }
        const updated = store.update(id, (slides) =>
          slides.filter((_, i) => i !== at)
        );
        return Promise.resolve(
          json({
            ...outline(updated),
            warnings: linkWarnings(updated.slides, [
              at,
              Number.POSITIVE_INFINITY,
            ]),
          })
        );
      },
    }),
    tool({
      name: 'deck_move_slide',
      title: 'Move a slide',
      description:
        'Moves the slide at `from` to `to`. `warnings` names every section link into the shifted slides that no longer matches.',
      inputSchema: z.object({ deckId, from: index, to: index }),
      handler: ({ deckId: id, from, to }) => {
        const deck = store.get(id);
        if (!deck) {
          return Promise.resolve(noDeck(id));
        }
        const count = deck.slides.length;
        if (from >= count || to >= count) {
          return Promise.resolve(
            text(`Both positions must be below ${count}.`, true)
          );
        }
        const updated = store.update(id, (slides) => {
          const [moved] = slides.splice(from, 1);
          slides.splice(to, 0, moved!);
          return slides;
        });
        return Promise.resolve(
          json({
            ...outline(updated),
            warnings: linkWarnings(updated.slides, [
              Math.min(from, to),
              Math.max(from, to),
            ]),
          })
        );
      },
    }),
    tool({
      name: 'deck_render_slide',
      title: 'Look at a slide',
      description:
        'Renders a stored slide to PNG so you can check it the way the audience will see it: overflow, crowding, and balance. A note says where content runs past the slide’s body or nodes are drawn over each other, or that the slide fits; another flags a section link that points past the deck or at a slide with a different title. The fit note measures geometry only, so the image is the check for wrapping and alignment. Fix what you see with deck_set_slide.',
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
        if (!deck) {
          return noDeck(id);
        }
        const slide = resolveDeck(deck).slides[at];
        if (!slide) {
          return text(
            `No slide ${at}; the deck has ${deck.slides.length}.`,
            true
          );
        }
        const [bytes, { overflow, overlaps }] = await Promise.all([
          png(slide, theme),
          layoutOf(slide),
        ]);
        const types = bodyTypes(slide);
        const { errors } = check(slide);
        const links = sectionLinkNotes(slide, deck.slides);
        return {
          content: [
            ...imageResult(bytes).content,
            ...(overflow === undefined
              ? []
              : [
                  {
                    type: 'text' as const,
                    text: overflowText(defs, overflow, types),
                  },
                ]),
            ...overlaps.map((overlap) => ({
              type: 'text' as const,
              text: overlapText(defs, overlap, types),
            })),
            ...links.map(({ note }) => ({ type: 'text' as const, text: note })),
            ...(errors.length > 0
              ? [
                  {
                    type: 'text' as const,
                    text: `This slide no longer validates; rewrite it with deck_set_slide. Errors: ${oneLineJson(errors)}`,
                  },
                ]
              : []),
            ...(overflow === undefined && overlaps.length === 0
              ? [
                  {
                    type: 'text' as const,
                    text: 'Fits its frame: nothing runs past the body, and no nodes are drawn over each other. This checks geometry only; look at the image for wrapping, balance, and alignment.',
                  },
                ]
              : []),
          ],
        };
      },
    }),
  ];
};
