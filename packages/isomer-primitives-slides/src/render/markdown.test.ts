/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  fencedBlock,
  markdownCode,
  markdownStrong,
  markdownTable,
  markdownText,
  marksMarkdown,
} from './markdown';
import {
  hostileValues,
  readBlocks,
  readParagraph,
  readRuns,
} from './markdown.fixtures';
import { LINE_TERMINATORS, parseMarks, stripMarks } from './marks';

describe('marksMarkdown', () => {
  it.each(hostileValues)('reads back as the authored runs: %j', (value) => {
    expect(readParagraph(marksMarkdown(value))).toEqual(
      parseMarks(value.replace(LINE_TERMINATORS, ' '))
    );
  });

  it('keeps code and strong marks and escapes everything else', () => {
    expect(marksMarkdown('**Bold** and `a_b` and [x](y)')).toBe(
      '**Bold** and `a_b` and \\[x]\\(y)'
    );
  });

  it('keeps a mark on one line', () => {
    expect(marksMarkdown('**a b** `c\rd`')).toBe('**a b** `c d`');
  });

  it('escapes a leading marker before its first mark', () => {
    expect(marksMarkdown('# **Bold**')).toBe('\\# **Bold**');
  });

  it('is empty for an empty value', () => {
    expect(marksMarkdown('')).toBe('');
    expect(markdownText('')).toBe('');
  });
});

describe('markdownText', () => {
  it.each(hostileValues)('reads back as one text run: %j', (value) => {
    const line = value.replace(LINE_TERMINATORS, ' ');
    expect(readParagraph(markdownText(value))).toEqual([
      { kind: 'text', text: line },
    ]);
  });

  it('turns every line terminator into a space', () => {
    expect(markdownText('a\nb\r\nc\rd e f')).toBe('a b c d e f');
  });

  it('escapes links, raw HTML, emphasis, and code', () => {
    expect(markdownText('[x](javascript:alert(1))')).toBe(
      '\\[x]\\(javascript:alert(1))'
    );
    expect(markdownText('<img src=x onerror=y>')).toBe(
      '\\<img src=x onerror=y>'
    );
    expect(markdownText('*a* _b_ `c` \\ &amp;')).toBe(
      '\\*a\\* \\_b\\_ \\`c\\` \\ \\&amp;'
    );
  });

  it('escapes a leading block marker, so a value never opens a block', () => {
    expect(markdownText('# Title')).toBe('\\# Title');
    expect(markdownText('- item')).toBe('\\- item');
    expect(markdownText('1. item')).toBe('1\\. item');
    expect(markdownText('a - b. 3.')).toBe('a - b. 3.');
    expect(markdownText('1.2K #hashtag -1')).toBe('1.2K #hashtag -1');
    expect(markdownText('---')).toBe('\\---');
    expect(markdownText('~~~js')).toBe('\\~~~js');
  });

  it('keeps leading and trailing whitespace as character references', () => {
    expect(markdownText('    indented code')).toBe('&#x20;   indented code');
    expect(markdownText('\t# not a heading')).toBe('&#x9;\\# not a heading');
    expect(markdownText('a  ')).toBe('a &#x20;');
    expect(marksMarkdown('  `code`')).toBe('&#x20; `code`');
  });
});

describe('markdownStrong', () => {
  it('wraps the value in one strong run, with any strong mark of its own flattened', () => {
    expect(markdownStrong('Before **now** `x`')).toBe('**Before now `x`**');
    expect(readParagraph(markdownStrong('Before **now** `x`'))).toEqual([
      { kind: 'strong', text: 'Before now x' },
    ]);
  });

  it.each(hostileValues)('reads back as one strong run: %j', (value) => {
    expect(readParagraph(markdownStrong(value))).toEqual([
      {
        kind: 'strong',
        text: stripMarks(value).replace(LINE_TERMINATORS, ' '),
      },
    ]);
  });
});

describe('markdownCode', () => {
  it.each(hostileValues)('reads back as one code run: %j', (value) => {
    expect(readParagraph(markdownCode(value))).toEqual([
      { kind: 'code', text: value.replace(LINE_TERMINATORS, ' ') },
    ]);
  });

  it('is a plain code span for a clean value', () => {
    expect(markdownCode('pnpm verify')).toBe('`pnpm verify`');
  });

  it('fences past any backtick run and stays on one line', () => {
    expect(markdownCode('a ``b`` c')).toBe('`a ``b`` c`');
    expect(markdownCode('a `b` c')).toBe('``a `b` c``');
    expect(markdownCode('`edge`')).toBe('`` `edge` ``');
    expect(markdownCode('one\ntwo')).toBe('`one two`');
  });

  it('pads a value that starts and ends with a space, which CommonMark would strip', () => {
    expect(markdownCode(' a ')).toBe('`  a  `');
    expect(markdownCode('   ')).toBe('`   `');
    expect(markdownCode(' a')).toBe('` a`');
  });
});
describe('markdownTable', () => {
  it('is a GFM table whose cells read back as the authored runs', () => {
    const columns = ['Name', 'GFM | pipes'];
    const rows = [
      ['`a|b`', 'a **| b**'],
      ['# heading', '- item'],
      ['', 'a\nb'],
      ['\\|', '\\'],
    ];
    const [table, ...rest] = readBlocks(markdownTable(columns, rows));
    expect(rest).toEqual([]);
    expect(table?.type).toBe('table');
    if (table?.type !== 'table') {
      return;
    }
    expect(
      table.children.map((row) =>
        row.children.map((cell) => readRuns(cell.children))
      )
    ).toEqual(
      [columns, ...rows].map((cells) =>
        cells.map((cell) => parseMarks(cell.replace(LINE_TERMINATORS, ' ')))
      )
    );
  });

  // A cell holds no whitespace at its edges, which GFM trims on the way in.
  it.each(hostileValues)('holds %j in one cell', (value) => {
    const [table] = readBlocks(markdownTable(['Column'], [[value]]));
    expect(table?.type).toBe('table');
    if (table?.type !== 'table') {
      return;
    }
    expect(table.children).toHaveLength(2);
    expect(readRuns(table.children[1]!.children[0]!.children)).toEqual(
      parseMarks(value.replace(LINE_TERMINATORS, ' ').trim())
    );
  });

  it('keeps every row to the header’s columns', () => {
    expect(markdownTable(['A', 'B'], [['1', '2']])).toBe(
      '| A | B |\n| - | - |\n| 1 | 2 |'
    );
  });
});

describe('fencedBlock', () => {
  it.each([
    ['a clean body', 'const a = 1;', 'ts'],
    ['a backtick fence in the body', 'a ```js\nconsole.log(1)\n``` b', 'md'],
    ['a longer fence in the body', '`````\nx', undefined],
    ['a tilde fence in the body', '~~~\nx\n~~~', 'sh'],
    ['a body with a trailing fence line', 'x\n```', 'text'],
    ['an empty body', '', 'diff'],
  ])('reads back as one code block with %s', (_name, source, language) => {
    const [block, ...rest] = readBlocks(fencedBlock(source, language));
    expect(rest).toEqual([]);
    expect(block).toMatchObject({
      type: 'code',
      lang: language ?? 'text',
      value: source,
    });
  });

  it('tags the fence text when the language token could close it', () => {
    const [block] = readBlocks(fencedBlock('x', 'ts\n```\nmalicious'));
    expect(block).toMatchObject({ type: 'code', lang: 'text', value: 'x' });
  });

  it('is the shortest fence that holds the body', () => {
    expect(fencedBlock('x', 'sh')).toBe('```sh\nx\n```');
    expect(fencedBlock('a ```js\nb', 'md')).toBe('````md\na ```js\nb\n````');
  });
});
