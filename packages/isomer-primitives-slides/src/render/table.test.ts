/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLACK_LIMITS, type SlackBlock } from '@elastic/isomer-sdk/slack';
import { describe, expect, it } from 'vitest';

import { richTextRun } from './marks';
import { displayColumns } from './mono';
import { slackTable, slackTableCell, textTable } from './table';

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

describe('slackTable', () => {
  const cell = (text: string) => [richTextRun(text)];
  const head = [cell('A'), cell('B')];
  const { tableCellCharsPerMessage, tableColumns, tableRows } = SLACK_LIMITS;

  /** Every run's text, in order. */
  const richText = (block: SlackBlock): string => {
    if (block.type !== 'rich_text') {
      throw new Error(`expected rich_text, got ${block.type}`);
    }
    return block.elements
      .flatMap((element) =>
        element.type === 'rich_text_section' ? element.elements : []
      )
      .map((run) => (run.type === 'text' ? run.text : ''))
      .join('');
  };

  it('keeps a table whose cells total the message budget, and falls back one character past it', () => {
    const at = tableCellCharsPerMessage - 3;
    expect(slackTable(head, [[cell('x'.repeat(at)), cell('y')]]).type).toBe(
      'table'
    );
    const over = 'x'.repeat(at + 1);
    expect(richText(slackTable(head, [[cell(over), cell('y')]]))).toBe(
      `A: ${over}\nB: y`
    );
  });

  it('keeps a table at the row and column limits, and falls back one past each', () => {
    const rows = (count: number) =>
      Array.from({ length: count }, () => [cell('x'), cell('y')]);
    expect(slackTable(head, rows(tableRows - 1)).type).toBe('table');
    expect(slackTable(head, rows(tableRows)).type).toBe('rich_text');
    const wide = (count: number) =>
      slackTable(
        Array.from({ length: count }, () => cell('h')),
        [Array.from({ length: count }, () => cell('c'))]
      ).type;
    expect(wide(tableColumns)).toBe('table');
    expect(wide(tableColumns + 1)).toBe('rich_text');
  });

  it('prints a heading on its own line and leaves out empty cells and empty column names', () => {
    const over = 'x'.repeat(tableCellCharsPerMessage);
    expect(
      richText(
        slackTable(
          [cell(''), cell('B')],
          ['GROUP', [cell('a'), cell('')], [cell('b'), cell(over)]]
        )
      )
    ).toBe(`GROUP\n\na\n\nb\nB: ${over}`);
  });
});
