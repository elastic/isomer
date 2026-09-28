/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { IsomerTool } from '@elastic/isomer-agent-tools';
import type {
  SlideOverflow,
  SlideOverlap,
} from '@elastic/isomer-primitives-slides';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { runtime } from '../../common/runtime';
import { createDeckStore } from '../store';

import type { DeckStore } from './deck';
import { createDeckTools, type DeckToolsOptions } from './deck_tools';
import { resolveDeck } from './resolve';

const resolver = vi.hoisted(() => ({ broken: false }));

vi.mock('@elastic/isomer-primitives-slides', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@elastic/isomer-primitives-slides')>();
  return {
    ...actual,
    resolveSlideRenders: (
      ...args: Parameters<typeof actual.resolveSlideRenders>
    ) => {
      if (resolver.broken) {
        throw new RangeError('Maximum call stack size exceeded');
      }
      return actual.resolveSlideRenders(...args);
    },
  };
});

afterEach(() => {
  resolver.broken = false;
});

const slide = (title: string) => ({
  type: 'view',
  title,
  body: [
    {
      type: 'slideFrame',
      brand: 'Ledger',
      body: [{ type: 'slideHeading', title }],
    },
  ],
});

const setup = (
  overflow?: SlideOverflow,
  overlaps: SlideOverlap[] = [],
  overrides: Partial<DeckToolsOptions> = {}
) => {
  const store = createDeckStore(mkdtempSync(join(tmpdir(), 'studio-')));
  const rendered: string[] = [];
  const tools = createDeckTools({
    runtime,
    store,
    png: (composition, theme) => {
      rendered.push(`${composition.title}:${theme}`);
      return Promise.resolve(new Uint8Array([1, 2, 3]));
    },
    layoutOf: () => Promise.resolve({ overflow, overlaps }),
    viewerUrl: (id) => `http://localhost:5178/decks/${id}`,
    ...overrides,
  });
  const handle = (name: string, input: Record<string, unknown>) => {
    const tool = tools.find((entry) => entry.name === name) as IsomerTool;
    return tool.handler(tool.inputSchema.parse(input));
  };
  const call = async (name: string, input: Record<string, unknown>) =>
    handle(name, input);
  const textOf = (result: Awaited<ReturnType<typeof call>>) =>
    JSON.parse((result.content[0] as { text: string }).text) as Record<
      string,
      unknown
    >;
  const notesOf = (result: Awaited<ReturnType<typeof call>>) =>
    result.content.flatMap((item) => (item.type === 'text' ? [item.text] : []));
  return { store, rendered, handle, call, textOf, notesOf };
};

const divider = (title: string, links: [string, number][]) => ({
  type: 'view',
  title,
  body: [
    {
      type: 'slideFrame',
      tone: 'inverse',
      logo: false,
      body: [
        {
          type: 'slideSection',
          number: '01',
          title,
          contents: links.map(([line]) => line),
          hrefs: links.map(([, at]) => `?slide=${at}`),
        },
      ],
    },
  ],
});

/** A deck of `slides`, written in order. */
const deckOf = async (
  { call, textOf }: ReturnType<typeof setup>,
  slides: object[]
) => {
  const { deckId } = textOf(await call('deck_create', { title: 'Deck' }));
  for (const [index, composition] of slides.entries()) {
    await call('deck_set_slide', { deckId, index, composition });
  }
  return deckId as string;
};

describe('deck tools', () => {
  it('creates a deck and appends validated slides', async () => {
    const { store, call, textOf } = setup();
    const created = textOf(await call('deck_create', { title: 'Refunds' }));
    const { deckId } = created;
    expect(created).toMatchObject({
      viewer: `http://localhost:5178/decks/${String(deckId)}`,
      present: `http://localhost:5178/decks/${String(deckId)}/present`,
    });
    const result = await call('deck_set_slide', {
      deckId,
      index: 0,
      composition: slide('Refunds settle in two days'),
    });
    expect(result.isError).toBeUndefined();
    expect(store.get(deckId as string)?.slides).toHaveLength(1);
  });

  it('rejects an invalid slide with errors and stores nothing', async () => {
    const { store, call, textOf } = setup();
    const { deckId } = textOf(await call('deck_create', { title: 'Refunds' }));
    const result = await call('deck_set_slide', {
      deckId,
      index: 0,
      composition: {
        type: 'view',
        body: [{ type: 'slideHeading', title: 'No frame' }],
      },
    });
    expect(result.isError).toBe(true);
    expect(textOf(result).errors).toEqual(
      expect.arrayContaining([expect.stringContaining('slideFrame')])
    );
    expect(store.get(deckId as string)?.slides).toHaveLength(0);
  });

  it('refuses an index past the end', async () => {
    const { call, textOf } = setup();
    const { deckId } = textOf(await call('deck_create', { title: 'Refunds' }));
    const result = await call('deck_set_slide', {
      deckId,
      index: 3,
      composition: slide('Too far'),
    });
    expect(result.isError).toBe(true);
  });

  it('inserts, moves, and removes slides', async () => {
    const { store, call, textOf } = setup();
    const { deckId } = textOf(await call('deck_create', { title: 'Order' }));
    const id = deckId as string;
    await call('deck_set_slide', { deckId, index: 0, composition: slide('A') });
    await call('deck_set_slide', { deckId, index: 1, composition: slide('C') });
    await call('deck_insert_slide', {
      deckId,
      index: 1,
      composition: slide('B'),
    });
    expect(store.get(id)?.slides.map(({ title }) => title)).toEqual([
      'A',
      'B',
      'C',
    ]);
    await call('deck_move_slide', { deckId, from: 2, to: 0 });
    expect(store.get(id)?.slides.map(({ title }) => title)).toEqual([
      'C',
      'A',
      'B',
    ]);
    await call('deck_remove_slide', { deckId, index: 1 });
    expect(store.get(id)?.slides.map(({ title }) => title)).toEqual(['C', 'B']);
  });

  it('renders a stored slide as PNG image content', async () => {
    const { rendered, call, textOf } = setup();
    const { deckId } = textOf(await call('deck_create', { title: 'Look' }));
    await call('deck_set_slide', {
      deckId,
      index: 0,
      composition: slide('Seen'),
    });
    const result = await call('deck_render_slide', {
      deckId,
      index: 0,
      theme: 'dark',
    });
    expect(result.content[0]).toMatchObject({
      type: 'image',
      mimeType: 'image/png',
    });
    expect(rendered).toEqual(['Seen:dark']);
  });

  it('says a slide fits when nothing runs over', async () => {
    const { call, textOf } = setup();
    const { deckId } = textOf(await call('deck_create', { title: 'Fits' }));
    await call('deck_set_slide', {
      deckId,
      index: 0,
      composition: slide('Fits'),
    });
    const result = await call('deck_render_slide', { deckId, index: 0 });
    expect(result.content[1]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Fits its frame') as unknown,
    });
  });

  it('says how far a slide runs past its body', async () => {
    const { call, textOf } = setup({
      top: 0,
      right: 0,
      bottom: 42,
      left: 0,
      nodes: [0],
    });
    const { deckId } = textOf(await call('deck_create', { title: 'Tall' }));
    await call('deck_set_slide', {
      deckId,
      index: 0,
      composition: slide('Tall'),
    });
    const result = await call('deck_render_slide', { deckId, index: 0 });
    expect(result.content[1]).toMatchObject({
      type: 'text',
      text: expect.stringContaining(
        '42px past the bottom, from body node 0 (slideHeading). Set `size: "s"` on body node 0 (slideHeading)'
      ) as unknown,
    });
  });

  it('says to shorten the copy when no node takes a size', async () => {
    const { call, textOf } = setup({
      top: 0,
      right: 0,
      bottom: 42,
      left: 0,
      nodes: [0],
    });
    const { deckId } = textOf(await call('deck_create', { title: 'List' }));
    await call('deck_set_slide', {
      deckId,
      index: 0,
      composition: {
        type: 'view',
        title: 'List',
        body: [
          {
            type: 'slideFrame',
            body: [{ type: 'slideBulletList', items: ['Short and true.'] }],
          },
        ],
      },
    });
    const result = await call('deck_render_slide', { deckId, index: 0 });
    expect(result.content[1]).toMatchObject({
      type: 'text',
      text: expect.stringContaining(
        'No node here takes `size`, so shorten the copy'
      ) as unknown,
    });
  });

  it('notes the authoring rules validation leaves open', async () => {
    const { call, textOf } = setup();
    const { deckId } = textOf(await call('deck_create', { title: 'Rules' }));
    const stored = textOf(
      await call('deck_set_slide', {
        deckId,
        index: 0,
        composition: {
          type: 'view',
          title: 'Bare',
          body: [
            {
              type: 'slideFrame',
              body: [{ type: 'slideBulletList', items: ['One point'] }],
            },
          ],
        },
      })
    );
    expect(stored.warnings).toEqual([
      expect.stringContaining('opens with `slideHeading`'),
      expect.stringContaining('`logo: false`'),
    ]);
  });

  it('flags section links past the deck or to a differently titled slide', async () => {
    const { call, textOf } = setup();
    const { deckId } = textOf(await call('deck_create', { title: 'Links' }));
    await call('deck_set_slide', {
      deckId,
      index: 0,
      composition: {
        type: 'view',
        title: 'Basics',
        body: [
          {
            type: 'slideFrame',
            tone: 'inverse',
            body: [
              {
                type: 'slideSection',
                number: '01',
                title: 'Basics',
                contents: ['Refunds', 'Payouts', 'Disputes'],
                hrefs: ['?slide=1', '?slide=2', '?slide=5'],
              },
            ],
          },
        ],
      },
    });
    await call('deck_set_slide', {
      deckId,
      index: 1,
      composition: slide('Refunds'),
    });
    await call('deck_set_slide', {
      deckId,
      index: 2,
      composition: slide('Chargebacks'),
    });
    const result = await call('deck_render_slide', { deckId, index: 0 });
    const notes = result.content.flatMap((item) =>
      item.type === 'text' ? [item.text] : []
    );
    expect(notes).toContainEqual(
      'Section link `?slide=2` sits on "Payouts" but opens slide 2, titled "Chargebacks".'
    );
    expect(notes).toContainEqual(
      expect.stringContaining(
        "Section link `?slide=5` points past the deck's 3 slides"
      )
    );
    expect(notes.join('\n')).not.toContain('?slide=1');
  });

  it('warns when a retitle leaves a divider linking to the slide stale', async () => {
    const { call, textOf } = setup();
    const { deckId } = textOf(await call('deck_create', { title: 'Stale' }));
    await call('deck_set_slide', {
      deckId,
      index: 0,
      composition: {
        type: 'view',
        title: 'Basics',
        body: [
          {
            type: 'slideFrame',
            tone: 'inverse',
            logo: false,
            body: [
              {
                type: 'slideSection',
                number: '01',
                title: 'Basics',
                contents: ['Refunds'],
                hrefs: ['?slide=1'],
              },
            ],
          },
        ],
      },
    });
    const stored = textOf(
      await call('deck_set_slide', {
        deckId,
        index: 1,
        composition: slide('Chargebacks'),
      })
    );
    expect(stored.warnings).toContainEqual(
      'Slide 0: Section link `?slide=1` sits on "Refunds" but opens slide 1, titled "Chargebacks".'
    );
  });

  it('names the nodes drawn over each other', async () => {
    const { call, textOf } = setup(undefined, [{ nodes: [0, 0], by: 64 }]);
    const { deckId } = textOf(await call('deck_create', { title: 'Full' }));
    await call('deck_set_slide', {
      deckId,
      index: 0,
      composition: slide('Full'),
    });
    const result = await call('deck_render_slide', { deckId, index: 0 });
    expect(result.content[1]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('(slideHeading)') as unknown,
    });
  });

  it('tells the agent when a stored slide no longer validates', async () => {
    const { store, call, textOf } = setup();
    const { deckId } = textOf(await call('deck_create', { title: 'Stale' }));
    const stale = slide('Stale');
    stale.body[0] = { ...stale.body[0]!, url: 'example.com' } as never;
    store.update(deckId as string, () => [stale as never]);
    const result = await call('deck_render_slide', { deckId, index: 0 });
    expect(result.content[0]).toMatchObject({ type: 'image' });
    expect(result.content[1]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('body[0].url') as unknown,
    });
  });

  const renderOf = (title: string, slideIndex: string) => ({
    type: 'view',
    title,
    body: [
      {
        type: 'slideFrame',
        brand: 'Ledger',
        body: [
          { type: 'slideHeading', title },
          { type: 'slideRender', slide: slideIndex, surface: 'svg' },
        ],
      },
    ],
  });

  it('rejects a slide whose render names a slide that does not exist', async () => {
    const { store, call, textOf } = setup();
    const { deckId } = textOf(await call('deck_create', { title: 'Proof' }));
    const result = await call('deck_set_slide', {
      deckId,
      index: 0,
      composition: renderOf('Forward', '3'),
    });
    expect(result.isError).toBe(true);
    expect(textOf(result).errors).toEqual([
      expect.stringContaining('unknown slide "3"'),
    ]);
    expect(store.get(deckId as string)?.slides).toHaveLength(0);
  });

  it('keeps a deck readable after a referenced slide is removed', async () => {
    const { store, call, textOf } = setup();
    const { deckId } = textOf(await call('deck_create', { title: 'Proof' }));
    await call('deck_set_slide', { deckId, index: 0, composition: slide('A') });
    await call('deck_set_slide', {
      deckId,
      index: 1,
      composition: renderOf('Shows A', '0'),
    });
    await call('deck_remove_slide', { deckId, index: 0 });
    const deck = store.get(deckId as string)!;
    expect(() => resolveDeck(deck)).not.toThrow();
    const rendered = await call('deck_render_slide', { deckId, index: 0 });
    expect(rendered.isError).toBeUndefined();
  });

  it('warns about a divider’s own link to a slide with a different title', async () => {
    const tools = setup();
    const deckId = await deckOf(tools, [slide('Intro'), slide('Chargebacks')]);
    const stored = tools.textOf(
      await tools.call('deck_set_slide', {
        deckId,
        index: 2,
        composition: divider('Basics', [
          ['Refunds', 1],
          ['Later', 7],
        ]),
      })
    );
    expect(stored.warnings).toEqual([
      'Slide 2: Section link `?slide=1` sits on "Refunds" but opens slide 1, titled "Chargebacks".',
    ]);
  });

  it('warns about every link into the slides an insert shifts', async () => {
    const tools = setup();
    const deckId = await deckOf(tools, [
      divider('Basics', [
        ['A', 1],
        ['B', 2],
      ]),
      slide('A'),
      slide('B'),
    ]);
    const stored = tools.textOf(
      await tools.call('deck_insert_slide', {
        deckId,
        index: 1,
        composition: {
          ...slide('New'),
          body: [{ ...slide('New').body[0]!, logo: false }],
        },
      })
    );
    expect(stored.warnings).toEqual([
      'Slide 0: Section link `?slide=1` sits on "A" but opens slide 1, titled "New".',
      'Slide 0: Section link `?slide=2` sits on "B" but opens slide 2, titled "A".',
    ]);
  });

  it('warns about links a move or a removal breaks', async () => {
    const tools = setup();
    const deckId = await deckOf(tools, [
      divider('Basics', [
        ['A', 1],
        ['B', 2],
      ]),
      slide('A'),
      slide('B'),
    ]);
    const moved = tools.textOf(
      await tools.call('deck_move_slide', { deckId, from: 2, to: 1 })
    );
    expect(moved.warnings).toEqual([
      'Slide 0: Section link `?slide=1` sits on "A" but opens slide 1, titled "B".',
      'Slide 0: Section link `?slide=2` sits on "B" but opens slide 2, titled "A".',
    ]);
    const removed = tools.textOf(
      await tools.call('deck_remove_slide', { deckId, index: 1 })
    );
    expect(removed.warnings).toEqual([
      "Slide 0: Section link `?slide=2` points past the deck's 2 slides; that is expected until the slide is written, so render this divider again once it is.",
    ]);
    expect(removed.slides).toHaveLength(2);
  });

  it('reports links by the slide they open, not by what their line says', async () => {
    const tools = setup();
    const deckId = await deckOf(tools, [
      divider('Basics', [['Refunds, which opens slide 3, then more', 1]]),
      slide('A'),
      slide('C'),
    ]);
    const stored = tools.textOf(
      await tools.call('deck_set_slide', {
        deckId,
        index: 3,
        composition: slide('D'),
      })
    );
    expect(stored.warnings).not.toContainEqual(
      expect.stringContaining('Section link')
    );
  });

  it('names the deck a move could not find', async () => {
    const { call, notesOf } = setup();
    const result = await call('deck_move_slide', {
      deckId: 'nope',
      from: 0,
      to: 1,
    });
    expect(result.isError).toBe(true);
    expect(notesOf(result)).toEqual([
      'No deck "nope". Call deck_list to see the decks that exist.',
    ]);
  });

  it.each([
    ['deck_get', {}],
    ['deck_set_slide', { index: 0, composition: slide('A') }],
    ['deck_insert_slide', { index: 0, composition: slide('A') }],
    ['deck_remove_slide', { index: 0 }],
    ['deck_move_slide', { from: 0, to: 1 }],
    ['deck_render_slide', { index: 0 }],
  ])('%s quotes an unknown deck id on one line', async (name, input) => {
    const { call, notesOf } = setup();
    const deckId = `x\n## Injected\u2028${'y'.repeat(300)}`;
    const result = await call(name, { deckId, ...input });
    expect(result.isError).toBe(true);
    const [note] = notesOf(result);
    expect(note).toContain('"x\\n## Injected\\u2028');
    expect(note).not.toMatch(/[\n\r\u2028\u2029]/);
    expect(note!.length).toBeLessThan(200);
  });

  it('lists a stale slide’s errors on one line', async () => {
    const { store, call, notesOf, textOf } = setup();
    const { deckId } = textOf(await call('deck_create', { title: 'Stale' }));
    const stale = slide('Stale');
    stale.body[0] = {
      ...stale.body[0]!,
      url: 'example.com',
      'odd\u2028key': 1,
    } as never;
    store.update(deckId as string, () => [stale as never]);
    const notes = notesOf(
      await call('deck_render_slide', { deckId, index: 0 })
    );
    const stalled = notes.find((note) => note.includes('no longer validates'));
    expect(stalled).toContain('body[0].url');
    expect(stalled).not.toMatch(/[\n\r\u2028\u2029]/);
  });

  describe('a failing dependency', () => {
    const failing = (): never => {
      throw Object.assign(new Error('EACCES: permission denied'), {
        code: 'EACCES',
      });
    };
    const brokenStore = (): DeckStore => ({
      list: failing,
      get: failing,
      create: failing,
      update: failing,
      remove: failing,
      subscribe: failing,
      subscribeAll: failing,
    });

    it.each([
      ['deck_create', { title: 'A' }],
      ['deck_list', {}],
      ['deck_get', { deckId: 'a' }],
      ['deck_set_slide', { deckId: 'a', index: 0, composition: slide('A') }],
      ['deck_insert_slide', { deckId: 'a', index: 0, composition: slide('A') }],
      ['deck_remove_slide', { deckId: 'a', index: 0 }],
      ['deck_move_slide', { deckId: 'a', from: 0, to: 1 }],
      ['deck_render_slide', { deckId: 'a', index: 0 }],
    ])(
      '%s resolves to a failed call when the store throws',
      async (name, input) => {
        const { handle } = setup(undefined, [], { store: brokenStore() });
        await expect(handle(name, input)).resolves.toEqual({
          content: [{ type: 'text', text: 'EACCES: permission denied' }],
          isError: true,
        });
      }
    );

    it.each([
      ['png', { png: () => Promise.reject(new Error('takumi failed')) }],
      [
        'layoutOf',
        { layoutOf: () => Promise.reject(new Error('takumi failed')) },
      ],
    ])(
      'deck_render_slide resolves to a failed call when %s rejects',
      async (_label, overrides) => {
        const tools = setup(undefined, [], overrides);
        const deckId = await deckOf(tools, [slide('A')]);
        await expect(
          tools.handle('deck_render_slide', { deckId, index: 0 })
        ).resolves.toEqual({
          content: [{ type: 'text', text: 'takumi failed' }],
          isError: true,
        });
      }
    );

    it('reports a resolver failure as a failed call, not as a reference error', async () => {
      const tools = setup();
      const { deckId } = tools.textOf(
        await tools.call('deck_create', { title: 'Deep' })
      );
      resolver.broken = true;
      const result = await tools.call('deck_set_slide', {
        deckId,
        index: 0,
        composition: slide('A'),
      });
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Maximum call stack size exceeded' }],
        isError: true,
      });
      expect(tools.store.get(deckId as string)?.slides).toHaveLength(0);
    });
  });
});
