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

  it('percent-encodes a pipe so it cannot end the link URL', () => {
    expect(link('https://a.b/a|b', 'x')).toBe('<https://a.b/a%7Cb|x>');
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

  it('reads single-asterisk emphasis as italics', () => {
    expect(gfmToSlackMrkdwn('a*b*c and *d e* but not * f * or \\*g*')).toBe(
      'a_b_c and _d e_ but not * f * or *g*'
    );
  });

  it('applies GFM flanking and escape parity to emphasis', () => {
    expect(gfmToSlackMrkdwn('a*.*b and *(x)*')).toBe('a*.*b and _(x)_');
    // An escaped backslash leaves the `*` after it free to open.
    expect(gfmToSlackMrkdwn('\\\\*x* and \\\\\\*y*')).toBe('\\_x_ and \\*y*');
    expect(gfmToSlackMrkdwn('(_x_) and a_b_')).toBe('(_x_) and a_b_');
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

  it('keeps a decoded or embedded fence from closing a code block early', () => {
    expect(
      gfmToSlackMrkdwn('| &#96;&#96;&#96; | \\`\\`\\` |\n| --- | --- |')
    ).toBe('```\n| ``\u200d` | ``\u200d` |\n| --- | --- |\n```');
    expect(gfmToSlackMrkdwn('```\na ``` b\n```')).toBe(
      '```\na ``\u200d` b\n```'
    );
  });

  it('keeps a decoded pipe inside the link URL', () => {
    expect(gfmToSlackMrkdwn('[x](https://a.b/a\\|b)')).toBe(
      '<https://a.b/a%7Cb|x>'
    );
  });

  it('pairs backtick runs of equal length into code spans', () => {
    expect(gfmToSlackMrkdwn('``a`b\\*`` and ` c `')).toBe(
      '`a\u02CBb\\*` and `c`'
    );
    // Backslashes are literal inside a code span, so `\\`` there still closes it.
    expect(gfmToSlackMrkdwn('`a\\*b\\`')).toBe('`a\\*b\\`');
    expect(gfmToSlackMrkdwn('# `a\\*b\\`')).toBe('*`a\\*b\\`*');
    // An escaped backtick is text, and the run after it opens its own span.
    expect(gfmToSlackMrkdwn('\\``a` ``b`')).toBe('``a` ``b`');
  });

  it('decodes fenced table cells as the table block does', () => {
    expect(
      gfmToSlackMrkdwn('| a \\| b | &#x20;c |\n| --- | --- |\n| 1\\* | 2 |')
    ).toBe('```\n| a | b |  c |\n| --- | --- |\n| 1* | 2 |\n```');
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

  it('reads an escaped closing delimiter as text', () => {
    expect(
      gfmToSlackMrkdwn('[x](https://a.b/a\\)b) [y](https://a.b/(c))')
    ).toBe('<https://a.b/a)b|x> <https://a.b/(c)|y>');
    expect(gfmToSlackMrkdwn('# title \\#')).toBe('*title #*');
    expect(gfmToSlackMrkdwn('# title #')).toBe('*title*');
  });

  it('decodes a control-character reference to U+FFFD, as micromark does', () => {
    expect(gfmToSlackMrkdwn('a&#x80;b&#127;c&#9;d')).toBe('a\uFFFDb\uFFFDc\td');
  });

  it('translates adversarial lines in linear time', () => {
    const size = 50_000;
    // Every run a new length, so no closer search can be shared.
    const distinctFences = Array.from({ length: 1_500 }, (_, i) =>
      '`'.repeat(i + 1)
    ).join(' ');
    const inputs = [
      '`'.repeat(size),
      Array.from({ length: size / 4 }, (_, i) => '`'.repeat((i % 7) + 1)).join(
        ' '
      ),
      '\\*'.repeat(size),
      `*${'\\*'.repeat(size)}`,
      '*a '.repeat(size / 3),
      '\\_'.repeat(size),
      'a*.'.repeat(size / 3),
      `\\${'\\\\*'.repeat(size / 3)}`,
      '\\``'.repeat(size / 3),
      '['.repeat(size),
      '[a](x'.repeat(size / 5),
      `# a${' '.repeat(size)}x`,
      `| ${'`'.repeat(size)} | b |\n| - | - |`,
      `${'| - '.repeat(size / 4)}x`,
      `# ${distinctFences}`,
      `| ${distinctFences} | b |\n| - | - |`,
    ];
    const started = performance.now();
    for (const input of inputs) {
      gfmToSlackMrkdwn(input);
      gfmToSlackBlocks(input);
    }
    expect(performance.now() - started).toBeLessThan(2_000);
  });

  it('applies the URL policy to the decoded destination', () => {
    expect(gfmToSlackMrkdwn('[x](&#106;avascript:alert%281%29)')).toBe('x');
    expect(gfmToSlackMrkdwn('[x](<javascript:alert%281%29>)')).toBe('x');
    // `&amp;` decodes to a literal `&`, so this is a relative path, not a scheme.
    expect(
      gfmToSlackMrkdwn('[x](&amp;#106;avascript:alert%281%29)')
    ).not.toMatch(/<javascript:/);
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

  it('splits on a pipe after an even run of backslashes', () => {
    const [table] = gfmToSlackBlocks('| a \\\\| b |\n| - | - |');
    if (table?.type !== 'table') {
      throw new Error('expected a table block');
    }
    expect(table.rows).toEqual([
      [
        { type: 'raw_text', text: 'a \\' },
        { type: 'raw_text', text: 'b' },
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

  it('reads a single-column table and closes a fence only on one as long', () => {
    expect(gfmToSlackBlocks('| a |\n| - |\n| 1 |')).toEqual([
      expect.objectContaining({
        type: 'table',
        rows: [
          [{ type: 'raw_text', text: 'a' }],
          [{ type: 'raw_text', text: '1' }],
        ],
      }),
    ]);
    expect(gfmToSlackBlocks('````\n```\ninner\n````\nafter')).toEqual([
      expect.objectContaining({
        elements: [
          expect.objectContaining({
            elements: [{ type: 'text', text: '```\ninner' }],
          }),
        ],
      }),
      { type: 'section', text: { type: 'mrkdwn', text: 'after' } },
    ]);
  });

  it('drops whitespace-only prose runs', () => {
    expect(gfmToSlackBlocks('\n\n  \n')).toEqual([]);
  });
});
