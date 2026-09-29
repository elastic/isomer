/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { richTextRun } from './marks';
import { displayColumns } from './mono';
import { slackTableCell, textTable } from './table';

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
      .map((line) => displayColumns(line.slice(0, line.lastIndexOf(' ') + 1)));
    expect(new Set(starts)).toEqual(new Set([starts[0]]));
  });

  it('sets a heading line on its own, outside the column widths', () => {
    expect(textTable(['A', 'B'], ['A LONG GROUP LABEL', ['x', 'y']]))
      .toMatchInlineSnapshot(`
        "A  B
        -  -
        A LONG GROUP LABEL
        x  y"
      `);
  });
});

describe('slackTableCell', () => {
  it('keeps unstyled runs raw and styled runs rich', () => {
    expect(slackTableCell([richTextRun('a '), richTextRun('b')])).toEqual({
      type: 'raw_text',
      text: 'a b',
    });
    expect(slackTableCell([richTextRun('a', { bold: true })])).toMatchObject({
      type: 'rich_text',
    });
  });
});
