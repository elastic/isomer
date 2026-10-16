/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appProblems } from './app_problems';

const load = () => Promise.reject(new Error('never called'));

const withPages = (pages: unknown) => [
  { id: 'decks', title: 'Decks', load, pages },
];

describe('appProblems', () => {
  it('accepts apps with and without valid pages', () => {
    expect(appProblems([{ id: 'plain', title: 'Plain', load }])).toEqual([]);
    expect(
      appProblems(
        withPages([
          { path: 'isomer', title: 'Isomer', section: 'Decks' },
          { path: 'isomer/3', title: 'Slide 3' },
        ])
      )
    ).toEqual([]);
  });

  it('accepts a description, and rejects an empty one', () => {
    expect(
      appProblems([
        { id: 'plain', title: 'Plain', description: 'A page.', load },
      ])
    ).toEqual([]);
    expect(
      appProblems([{ id: 'plain', title: 'Plain', description: ' ', load }])
    ).toEqual(['apps[0] ("plain"): description must be a non-empty string.']);
  });

  it('rejects pages that are not an array of objects', () => {
    expect(appProblems(withPages('isomer'))).toEqual([
      'apps[0] ("decks"): pages must be an array.',
    ]);
    expect(appProblems(withPages([null]))).toEqual([
      'apps[0] ("decks"): pages[0] must be an object.',
    ]);
  });

  it.each(['', '/isomer', 'isomer/', 'a//b', 7])(
    'rejects the path %j',
    (path) => {
      expect(appProblems(withPages([{ path, title: 'T' }]))).toEqual([
        'apps[0] ("decks"): pages[0]: path must be one or more non-empty segments, with no leading or trailing "/".',
      ]);
    }
  );

  it('rejects a path an earlier page uses', () => {
    expect(
      appProblems(
        withPages([
          { path: 'a/b', title: 'One' },
          { path: 'a/b', title: 'Two' },
        ])
      )
    ).toEqual([
      'apps[0] ("decks"): pages[1]: path "a/b" is used by an earlier page.',
    ]);
  });

  it('rejects an empty title and an empty section', () => {
    expect(
      appProblems(
        withPages([
          { path: 'a', title: ' ' },
          { path: 'b', title: 'B', section: '' },
          { path: 'c', title: 'C', section: 3 },
        ])
      )
    ).toEqual([
      'apps[0] ("decks"): pages[0]: title must be a non-empty string.',
      'apps[0] ("decks"): pages[1]: section must be a non-empty string.',
      'apps[0] ("decks"): pages[2]: section must be a non-empty string.',
    ]);
  });
});
