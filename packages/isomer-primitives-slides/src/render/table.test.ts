/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { monoColumns } from './mono';
import { textTable } from './table';

describe('textTable', () => {
  it('aligns columns by display width, wide glyphs and combining marks included', () => {
    const table = textTable(
      ['Name', 'Qty'],
      [
        ['界界', '1'],
        ['é', '2'],
        ['Tea', '3'],
      ]
    );
    const starts = table
      .split('\n')
      .map((line) => monoColumns(line.slice(0, line.lastIndexOf(' ') + 1)));
    expect(new Set(starts)).toEqual(new Set([starts[0]]));
  });
});
