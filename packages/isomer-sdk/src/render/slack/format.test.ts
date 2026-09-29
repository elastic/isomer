/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { SLACK_LIMITS } from './blocks';
import {
  bold,
  clampSlackText,
  code,
  codeBlock,
  escapeMrkdwn,
  formatHeaderText,
  gfmToSlackBlocks,
  gfmToSlackMrkdwn,
  italic,
  joinMrkdwn,
  link,
  strike,
} from './format';

describe('mrkdwn helpers', () => {
  it('escapes only the three characters Slack reads as HTML', () => {
    expect(escapeMrkdwn('a & b < c > *d*')).toBe('a &amp; b &lt; c &gt; *d*');
  });

  it('wraps emphasis around escaped text', () => {
    expect(bold('a<b')).toBe('*a&lt;b*');
    expect(italic('x')).toBe('_x_');
    expect(strike('x')).toBe('~x~');
  });

  it('keeps code contents literal and demotes backticks', () => {
    expect(code('a<b`c')).toBe('`a<bˋc`');
    expect(codeBlock('x\n```\ny')).toBe('```\nx\n``‍`\ny\n```');
  });

  it('builds links and degrades a blocked destination to text', () => {
    expect(link('https://example.com/?a=1&b=2', 'Docs & more')).toBe(
      '<https://example.com/?a=1&amp;b=2|Docs &amp; more>'
    );
    expect(link('https://example.com')).toBe('<https://example.com>');
    expect(link('javascript:alert(1)', 'Click')).toBe('Click');
    expect(link('javascript:alert(1)')).toBe('javascript:alert(1)');
  });
});

describe('clamping', () => {
  it('returns short text untouched and appends an ellipsis when cutting', () => {
    expect(clampSlackText('hello', 5)).toBe('hello');
    expect(clampSlackText('hello world', 6)).toBe('hello…');
    expect(clampSlackText('hello world', 1)).toBe('h');
  });

  it('clamps at a grapheme boundary, never splitting a surrogate pair or emoji sequence', () => {
    expect(clampSlackText(`a${'😀'.repeat(75)}`, 75)).toBe(
      `a${'😀'.repeat(36)}…`
    );
    expect(clampSlackText('ab👨‍👩‍👧cd', 6)).toBe('ab…');
    expect(clampSlackText('😀😀', 1)).toBe('');
  });

  it('collapses whitespace in header text and clamps to the header budget', () => {
    expect(formatHeaderText('  a \n\t b  ')).toBe('a b');
    const long = 'x'.repeat(SLACK_LIMITS.headerTextChars + 10);
    expect(formatHeaderText(long)).toHaveLength(SLACK_LIMITS.headerTextChars);
  });

  it('joins lines, dropping empties, within the section budget', () => {
    expect(joinMrkdwn(['a', undefined, '', 'b'])).toBe('a\nb');
    expect(joinMrkdwn(['abcdef', 'ghi'], 4)).toBe('abc…');
  });
});

describe('gfmToSlackMrkdwn', () => {
  it('translates inline emphasis, links, and code spans', () => {
    expect(
      gfmToSlackMrkdwn('**bold** and _it_ and `a<b` [L](https://x.y)')
    ).toBe('*bold* and _it_ and `a<b` <https://x.y|L>');
  });

  it('bolds ATX headings', () => {
    expect(gfmToSlackMrkdwn('## Title ##')).toBe('*Title*');
  });

  it('copies fenced code verbatim without the language hint', () => {
    expect(gfmToSlackMrkdwn('```ts\nconst a = 1 < 2;\n```')).toBe(
      '```\nconst a = 1 < 2;\n```'
    );
  });

  it('fences pipe tables', () => {
    expect(gfmToSlackMrkdwn('| a | b |\n| --- | --- |\n| 1 | 2 |')).toBe(
      '```\n| a | b |\n| --- | --- |\n| 1 | 2 |\n```'
    );
  });

  it('keeps the blockquote prefix and translates its body', () => {
    expect(gfmToSlackMrkdwn('> **note** & more')).toBe('> *note* &amp; more');
  });

  it('passes list markers through as plain lines', () => {
    expect(gfmToSlackMrkdwn('- one\n- **two**')).toBe('- one\n- *two*');
  });

  it('does not treat an underscore inside a word as italics', () => {
    expect(gfmToSlackMrkdwn('snake_case_name')).toBe('snake_case_name');
  });

  it('resolves backslash escapes to their literal characters', () => {
    expect(gfmToSlackMrkdwn('1\\. 2\\*3 \\[a\\] \\<b\\> C:\\dir')).toBe(
      '1. 2*3 [a] &lt;b&gt; C:\\dir'
    );
  });

  it('never reads an escaped delimiter as formatting', () => {
    expect(
      gfmToSlackMrkdwn('\\*\\*x\\*\\* \\_y\\_ \\`z\\` \\[l](https://a.b)')
    ).toBe('**x** _y_ `z` [l](https://a.b)');
  });

  it('resolves escapes inside emphasis, links, and headings', () => {
    expect(gfmToSlackMrkdwn('**a\\_b** _c\\*d_ [x\\]y](<https://a.b/c>)')).toBe(
      '*a_b* _c*d_ <https://a.b/c|x]y>'
    );
    expect(gfmToSlackMrkdwn('# \\#1 &#x26; co')).toBe('*#1 &amp; co*');
  });

  it('keeps backslashes inside code spans in headings and emphasis', () => {
    expect(gfmToSlackMrkdwn('# use `x\\*y`')).toBe('*use `x\\*y`*');
    expect(gfmToSlackMrkdwn('**`a\\.b`**')).toBe('*`a\\.b`*');
  });

  it('applies the URL policy to the decoded destination', () => {
    expect(gfmToSlackMrkdwn('[x](&#106;avascript:alert%281%29)')).toBe('x');
    expect(gfmToSlackMrkdwn('[x](<javascript:alert%281%29>)')).toBe('x');
  });

  it('decodes numeric character references and keeps an escaped one literal', () => {
    expect(gfmToSlackMrkdwn('&#x20;a &#42; &#0; \\&#x20;')).toBe(
      ' a * \uFFFD &amp;#x20;'
    );
  });
});

describe('gfmToSlackBlocks', () => {
  it('emits prose as sections and fenced code as preformatted rich text', () => {
    const blocks = gfmToSlackBlocks('Intro **x**\n\n```\ncode\n```\n\nOutro');
    expect(blocks).toEqual([
      { type: 'section', text: { type: 'mrkdwn', text: 'Intro *x*' } },
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_preformatted',
            elements: [{ type: 'text', text: 'code' }],
          },
        ],
      },
      { type: 'section', text: { type: 'mrkdwn', text: 'Outro' } },
    ]);
  });

  it('emits a pipe table as a native table block with alignments', () => {
    const [table] = gfmToSlackBlocks('| a | b |\n| :--- | ---: |\n| 1 | 2 |');
    expect(table).toEqual({
      type: 'table',
      rows: [
        [
          { type: 'raw_text', text: 'a' },
          { type: 'raw_text', text: 'b' },
        ],
        [
          { type: 'raw_text', text: '1' },
          { type: 'raw_text', text: '2' },
        ],
      ],
      column_settings: [
        { align: 'left', is_wrapped: true },
        { align: 'right', is_wrapped: true },
      ],
    });
  });

  it('clamps table rows and columns and section text to the Slack limits', () => {
    const columns = SLACK_LIMITS.tableColumns + 2;
    const header = `| ${Array.from({ length: columns }, (_, i) => `c${i}`).join(' | ')} |`;
    const separator = `| ${Array.from({ length: columns }, () => '---').join(' | ')} |`;
    const rows = Array.from(
      { length: SLACK_LIMITS.tableRows + 5 },
      (_, i) =>
        `| ${Array.from({ length: columns }, () => String(i)).join(' | ')} |`
    );
    const [table] = gfmToSlackBlocks([header, separator, ...rows].join('\n'));
    if (table?.type !== 'table') {
      throw new Error('expected a table block');
    }
    expect(table.rows).toHaveLength(SLACK_LIMITS.tableRows);
    expect(table.rows[0]).toHaveLength(SLACK_LIMITS.tableColumns);
    expect(table.column_settings).toHaveLength(SLACK_LIMITS.tableColumns);

    const [section] = gfmToSlackBlocks(
      'x'.repeat(SLACK_LIMITS.sectionTextChars + 50)
    );
    if (section?.type !== 'section') {
      throw new Error('expected a section block');
    }
    expect(section.text?.text).toHaveLength(SLACK_LIMITS.sectionTextChars);
  });

  it('splits table rows on unescaped pipes and resolves escapes in cells', () => {
    const [table] = gfmToSlackBlocks(
      '| a \\| b | &#x20;c |\n| - | - |\n| 1\\* | \\_2 |'
    );
    if (table?.type !== 'table') {
      throw new Error('expected a table block');
    }
    expect(table.rows).toEqual([
      [
        { type: 'raw_text', text: 'a | b' },
        { type: 'raw_text', text: ' c' },
      ],
      [
        { type: 'raw_text', text: '1*' },
        { type: 'raw_text', text: '_2' },
      ],
    ]);
  });

  it('keeps backslashes inside code spans in table cells except before a pipe', () => {
    const [table] = gfmToSlackBlocks('| `a\\.b` | `a\\|b` |\n| - | - |');
    if (table?.type !== 'table') {
      throw new Error('expected a table block');
    }
    expect(table.rows).toEqual([
      [
        { type: 'raw_text', text: '`a\\.b`' },
        { type: 'raw_text', text: '`a|b`' },
      ],
    ]);
  });

  it('drops whitespace-only prose runs', () => {
    expect(gfmToSlackBlocks('\n\n  \n')).toEqual([]);
  });
});
