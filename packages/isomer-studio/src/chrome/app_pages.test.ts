/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StudioAppPage } from '../config';

import { activeAppPage, appPageSections, filterAppPages } from './app_pages';

const pages: StudioAppPage[] = [
  { path: 'isomer', title: 'Isomer', section: 'Decks' },
  { path: 'intro', title: 'Introduction' },
  { path: 'isomer/3', title: 'Isomer, slide 3', section: 'Decks' },
  { path: 'drafts/a', title: 'Draft A', section: 'Drafts' },
  { path: 'distillate', title: 'Distillate', section: 'Decks' },
  { path: 'about', title: 'About' },
];

describe('appPageSections', () => {
  it('lists unsectioned pages first, then sections in order of first appearance', () => {
    expect(
      appPageSections(pages).map(({ title, pages: listed }) => [
        title,
        listed.map(({ path }) => path),
      ])
    ).toEqual([
      [undefined, ['intro', 'about']],
      ['Decks', ['isomer', 'isomer/3', 'distillate']],
      ['Drafts', ['drafts/a']],
    ]);
  });

  it('leaves out the unsectioned group when every page has a section', () => {
    expect(
      appPageSections(pages.filter(({ section }) => section)).map(
        ({ title }) => title
      )
    ).toEqual(['Decks', 'Drafts']);
  });
});

describe('activeAppPage', () => {
  it.each([
    ['isomer', 'isomer'],
    ['isomer/2', 'isomer'],
    ['isomer/3', 'isomer/3'],
    ['isomer/3/1', 'isomer/3'],
    ['isomer-two', undefined],
    ['', undefined],
    ['drafts', undefined],
  ])('picks the longest page at or above %j', (path, expected) => {
    expect(activeAppPage(pages, path)?.path).toBe(expected);
  });
});

describe('filterAppPages', () => {
  it('keeps pages whose title has every word, ignoring case', () => {
    expect(
      filterAppPages(pages, 'isomer SLIDE').map(({ path }) => path)
    ).toEqual(['isomer/3']);
    expect(filterAppPages(pages, ' ')).toEqual(pages);
  });
});
