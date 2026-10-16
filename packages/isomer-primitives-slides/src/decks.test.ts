/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';

import type { SavedDeck } from '../decks/catalog';
import { deckCatalog } from '../decks/catalog';

import { findings } from './examples/measure';
import { slideDeckFrame, slidesPack } from './pack';

const decksDir = join(dirname(fileURLToPath(import.meta.url)), '../decks');

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const deckFiles = (dir: string) =>
  readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace(/\.json$/, ''))
    .sort();

const readDeck = (path: string) =>
  JSON.parse(readFileSync(path, 'utf8')) as SavedDeck;

const migrated = deckFiles(decksDir).map((id) => ({
  id,
  deck: readDeck(join(decksDir, `${id}.json`)),
}));

const slides = migrated.flatMap(({ id, deck }) =>
  deck.slides.map((slide, index) => ({
    name: `${id} #${index + 1} ${slide.title ?? ''}`,
    slide,
  }))
);

describe('the committed decks', () => {
  it('pair each frozen v1 deck with a migrated copy of the same length', () => {
    for (const id of deckFiles(join(decksDir, 'v1'))) {
      const { slides: original } = readDeck(join(decksDir, 'v1', `${id}.json`));
      expect(
        migrated.find((entry) => entry.id === id)?.deck.slides,
        id
      ).toHaveLength(original.length);
    }
  });

  it('name each file by its id, and list each in the catalog', () => {
    for (const { id, deck } of migrated) {
      expect(deck.id).toBe(id);
    }
    expect(deckCatalog.map(({ id }) => id).sort()).toEqual(
      migrated.map(({ id }) => id)
    );
    for (const { id, title } of deckCatalog) {
      expect(migrated.find((entry) => entry.id === id)?.deck.title).toBe(title);
    }
  });

  it('load each catalog entry', async () => {
    for (const { id, load } of deckCatalog) {
      expect((await load()).id).toBe(id);
    }
  });
});

describe('every migrated slide', () => {
  it.each(slides)(
    '$name validates and renders on every surface',
    ({ slide }) => {
      expect(runtime.validate(slide).errors).toEqual([]);
      const themed: Composition = { ...slide, theme: 'dark' };
      const { surfaces } = runtime;
      expect(surfaces.html.render(themed).validationErrors ?? []).toEqual([]);
      expect(
        renderToStaticMarkup(surfaces.react.render(themed, { wrapper: true }))
      ).not.toBe('');
      expect(surfaces.markdown.render(themed)).not.toBe('');
      expect(surfaces.text.render(themed)).not.toBe('');
      expect(surfaces.slack.render(themed).blocks.length).toBeGreaterThan(0);
      expect(surfaces.snapshot.render(themed).html).not.toBe('');
    }
  );

  it.each(slides)('$name fits its slide', async ({ slide }) => {
    expect(await findings(slide)).toEqual([]);
  });
});
