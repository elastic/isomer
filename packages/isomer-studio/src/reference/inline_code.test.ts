/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splitCode } from './inline_code';
import { enumLiteral } from './props_table';

describe('splitCode', () => {
  it('sets backtick spans and whole-word primitive names as code', () => {
    expect(
      splitCode(
        'Add `spans` to bracket steps; use slideLanes, not slideLanesX.',
        ['slideLanes']
      )
    ).toEqual([
      { text: 'Add ', isCode: false },
      { text: 'spans', isCode: true },
      { text: ' to bracket steps; use ', isCode: false },
      { text: 'slideLanes', isCode: true },
      { text: ', not slideLanesX.', isCode: false },
    ]);
  });

  it('leaves prose without code alone', () => {
    expect(splitCode('Plain prose.')).toEqual([
      { text: 'Plain prose.', isCode: false },
    ]);
  });
});

describe('enumLiteral', () => {
  it('quotes each value as a union', () => {
    expect(enumLiteral(['l', 'm', 's'])).toBe('"l" | "m" | "s"');
  });
});
