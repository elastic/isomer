/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { IsomerTool } from '@elastic/isomer-mcp/tools';
import { describe, expect, it } from 'vitest';

import { createDeckTools } from './deck_tools';
import { resolveDeck } from './resolve';
import { createDeckStore } from './store';

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

const setup = () => {
  const store = createDeckStore(mkdtempSync(join(tmpdir(), 'studio-')));
  const rendered: string[] = [];
  const tools = createDeckTools(
    store,
    (composition, theme) => {
      rendered.push(`${composition.title}:${theme}`);
      return Promise.resolve(new Uint8Array([1, 2, 3]));
    },
    (id) => `http://localhost:5178/decks/${id}`
  );
  const call = async (name: string, input: Record<string, unknown>) => {
    const tool = tools.find((entry) => entry.name === name) as IsomerTool;
    return tool.handler(tool.inputSchema.parse(input));
  };
  const textOf = (result: Awaited<ReturnType<typeof call>>) =>
    JSON.parse((result.content[0] as { text: string }).text) as Record<
      string,
      unknown
    >;
  return { store, rendered, call, textOf };
};

describe('deck tools', () => {
  it('creates a deck and appends validated slides', async () => {
    const { store, call, textOf } = setup();
    const { deckId } = textOf(await call('deck_create', { title: 'Refunds' }));
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
});
