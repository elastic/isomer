/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Composition } from '@elastic/isomer-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Deck } from './host/deck';
import { createDeckStore } from './store';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, renameSync: vi.fn(actual.renameSync) };
});

const slide: Composition = { type: 'view', title: 'One', body: [] };

/** A decks directory inside its own temp dir, so a path that escapes it lands somewhere the test can see. */
const tempDecks = () => {
  const parent = mkdtempSync(join(tmpdir(), 'studio-store-'));
  const dir = join(parent, '.decks');
  mkdirSync(dir);
  return { parent, dir };
};

const deckFile = (deck: Partial<Deck>) =>
  JSON.stringify({
    title: 'Kept',
    slides: [],
    updatedAt: '2026-01-01',
    ...deck,
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createDeckStore', () => {
  it('reads back what it saved', () => {
    const { dir } = tempDecks();
    const first = createDeckStore(dir);
    const { id } = first.create('Refunds');
    first.update(id, () => [slide]);
    expect(createDeckStore(dir).get(id)).toMatchObject({
      id,
      title: 'Refunds',
      slides: [slide],
    });
  });

  it('writes a deck through a temp file it renames into place', () => {
    const { dir } = tempDecks();
    const store = createDeckStore(dir);
    vi.mocked(renameSync).mockClear();
    const { id } = store.create('Atomic');
    expect(renameSync).toHaveBeenCalledOnce();
    const [from, to] = vi.mocked(renameSync).mock.calls[0]!;
    expect(to).toBe(join(dir, `${id}.json`));
    expect(from).not.toBe(to);
    expect(readdirSync(dir)).toEqual([`${id}.json`]);
  });

  it('skips a truncated file, and every other file that is not a deck, with one warning', () => {
    const { dir } = tempDecks();
    writeFileSync(join(dir, 'good.json'), deckFile({ id: 'good' }));
    writeFileSync(join(dir, 'cut.json'), deckFile({ id: 'cut' }).slice(0, 20));
    writeFileSync(join(dir, 'shape.json'), JSON.stringify({ id: 'shape' }));
    writeFileSync(join(dir, 'null.json'), 'null');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createDeckStore(dir);
    expect(store.list().map(({ id }) => id)).toEqual(['good']);
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/cut\.json.*shape\.json/s);
  });

  it('skips a file whose id is not its name, so no id reaches outside the directory', () => {
    const { parent, dir } = tempDecks();
    writeFileSync(join(dir, 'x.json'), deckFile({ id: '../x' }));
    writeFileSync(join(dir, 'y.json'), deckFile({ id: 'z' }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createDeckStore(dir);
    expect(store.list()).toEqual([]);
    expect(() => store.update('../x', () => [slide])).toThrow();
    expect(existsSync(join(parent, 'x.json'))).toBe(false);
  });

  it('refuses to remove a deck by an id that is not a deck id', () => {
    const { parent, dir } = tempDecks();
    const outside = join(parent, 'outside.json');
    writeFileSync(outside, '{}');
    const store = createDeckStore(dir);
    expect(store.remove('../outside')).toBe(false);
    expect(readFileSync(outside, 'utf8')).toBe('{}');
  });

  it('tells a deck’s subscribers when it is removed', () => {
    const { dir } = tempDecks();
    const store = createDeckStore(dir);
    const { id } = store.create('Gone');
    const seen: (Deck | undefined)[] = [];
    store.subscribe(id, (deck) => seen.push(deck));
    store.update(id, () => [slide]);
    expect(store.remove(id)).toBe(true);
    expect(seen).toEqual([expect.objectContaining({ id }), undefined]);
    expect(readdirSync(dir)).toEqual([]);
  });
});
