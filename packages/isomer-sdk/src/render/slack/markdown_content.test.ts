/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { markdownFromString, md } from '../markdown/builder';
import { SAFE_INPUTS } from '../markdown/safe_inputs.fixtures';

import {
  SLACK_LIMITS,
  type SlackBlock,
  type SlackRichTextBlockElement,
  type SlackRichTextInline,
} from './blocks';
import {
  gfmToSlackBlocks,
  markdownContentToSlackBlocks,
} from './markdown_content';

const runs = (inlines: readonly SlackRichTextInline[]): string =>
  inlines
    .map((run) => {
      const text = run.type === 'link' ? (run.text ?? run.url) : run.text;
      const style = Object.keys(run.style ?? {}).join();
      return style ? `[${style}:${text}]` : text;
    })
    .join('');

// An element as its type, `|` when bordered, and its runs, a styled run as
// `[style:text]`; list items are joined with ` / `.
const element = (item: SlackRichTextBlockElement): string =>
  `${item.type.replace('rich_text_', '')}${'border' in item && item.border ? '|' : ''}: ${
    item.type === 'rich_text_list'
      ? item.elements.map(({ elements }) => runs(elements)).join(' / ')
      : runs(item.elements)
  }`;

const outline = (blocks: readonly SlackBlock[]): string[] =>
  blocks.flatMap((block) => {
    switch (block.type) {
      case 'rich_text':
        return block.elements.map(element);
      case 'section':
        return [`section: ${block.text?.text}`];
      case 'table':
        return [
          `table: ${block.rows
            .map((row) =>
              row
                .map((cell) =>
                  cell.type === 'raw_text'
                    ? cell.text
                    : cell.elements.map(element).join()
                )
                .join(' | ')
            )
            .join(' / ')}`,
        ];
      default:
        return [block.type];
    }
  });

describe('markdownContentToSlackBlocks', () => {
  it('keeps text literal and carries formatting, nested at any depth, as styles', () => {
    expect(
      markdownContentToSlackBlocks(
        md.paragraph(
          '_y_ *x* <b> & ',
          md.strong(md.emphasis(md.strong('deep'), ' ', md.code('a**b')))
        )
      )
    ).toEqual([
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: '_y_ *x* <b> & ' },
              {
                type: 'text',
                text: 'deep',
                style: { bold: true, italic: true },
              },
              { type: 'text', text: ' ', style: { bold: true, italic: true } },
              {
                type: 'text',
                text: 'a**b',
                style: { bold: true, italic: true, code: true },
              },
            ],
          },
        ],
      },
    ]);
  });

  it('links a safe destination, and an image to its source', () => {
    const [block] = markdownContentToSlackBlocks(
      md.paragraph(
        md.link(['a ', md.strong('b')], 'https://a.b'),
        md.link('', 'https://c.d'),
        md.image('alt', 'https://e.f/i.png'),
        md.image('data', 'data:image/png;base64,AA')
      )
    );
    expect(block).toEqual({
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            { type: 'link', url: 'https://a.b', text: 'a ' },
            {
              type: 'link',
              url: 'https://a.b',
              text: 'b',
              style: { bold: true },
            },
            { type: 'link', url: 'https://c.d' },
            { type: 'link', url: 'https://e.f/i.png', text: 'alt' },
            { type: 'text', text: 'data' },
          ],
        },
      ],
    });
  });

  it.each([
    'javascript:alert(1)',
    '#',
    '/path',
    './a',
    '//host/a',
    'https:/a',
    'https://',
    'http://?q=1',
    'https:///path',
    'mailto:',
  ])('keeps the styled label of a link to %s', (href) => {
    expect(
      markdownContentToSlackBlocks(
        md.paragraph(
          md.link(['a ', md.strong('b')], href),
          md.link('', href),
          md.image('alt', '/i.png')
        )
      )
    ).toEqual([
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'a ' },
              { type: 'text', text: 'b', style: { bold: true } },
              { type: 'text', text: 'alt' },
            ],
          },
        ],
      },
    ]);
  });

  it('links an absolute URL, mailto included, and a table cell only to one', () => {
    const [paragraph, table] = markdownContentToSlackBlocks([
      md.paragraph(
        md.link(md.emphasis('a'), 'mailto:a@b.c'),
        md.link('b', 'http://a.b')
      ),
      md.table(['h'], [[md.link('x', '/path')]]),
    ]);
    expect(paragraph).toEqual({
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            {
              type: 'link',
              url: 'mailto:a@b.c',
              text: 'a',
              style: { italic: true },
            },
            { type: 'link', url: 'http://a.b', text: 'b' },
          ],
        },
      ],
    });
    expect(table).toMatchObject({
      rows: [
        [{ type: 'raw_text', text: 'h' }],
        [{ type: 'raw_text', text: 'x' }],
      ],
    });
  });

  it('shares one rich_text block across a run and splits it at a table', () => {
    const blocks = markdownContentToSlackBlocks([
      md.heading(2, 'Title'),
      md.paragraph('one'),
      md.table(['h', md.strong('b')], [['1', md.code('2')]]),
      md.codeBlock('```\ninner', 'ts'),
    ]);
    expect(blocks).toEqual([
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Title', style: { bold: true } },
              { type: 'text', text: '\n' },
            ],
          },
          {
            type: 'rich_text_section',
            elements: [{ type: 'text', text: 'one' }],
          },
        ],
      },
      {
        type: 'table',
        rows: [
          [
            { type: 'raw_text', text: 'h' },
            {
              type: 'rich_text',
              elements: [
                {
                  type: 'rich_text_section',
                  elements: [
                    { type: 'text', text: 'b', style: { bold: true } },
                  ],
                },
              ],
            },
          ],
          [
            { type: 'raw_text', text: '1' },
            {
              type: 'rich_text',
              elements: [
                {
                  type: 'rich_text_section',
                  elements: [
                    { type: 'text', text: '2', style: { code: true } },
                  ],
                },
              ],
            },
          ],
        ],
        column_settings: [
          { align: 'left', is_wrapped: true },
          { align: 'left', is_wrapped: true },
        ],
      },
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_preformatted',
            elements: [{ type: 'text', text: '```\ninner' }],
          },
        ],
      },
    ]);
  });

  it.each(SAFE_INPUTS)(
    'keeps %j exact in rich text, never on the string path',
    (input) => {
      const expected = input.replace(/\r\n|[\n\r\u2028\u2029]/g, ' ');
      const blocks = markdownContentToSlackBlocks([
        md.paragraph(input),
        md.paragraph(md.strong(input)),
        md.list([input]),
        md.blockquote(md.paragraph(input)),
        md.table(['h'], [[input]]),
      ]);
      expect(blocks.some((block) => block.type === 'section')).toBe(false);
      const [richText, table] = blocks;
      if (richText?.type !== 'rich_text' || table?.type !== 'table') {
        throw new Error('expected rich text then a table');
      }
      const texts = richText.elements.map((element) =>
        (element.type === 'rich_text_list'
          ? element.elements.flatMap((item) => item.elements)
          : element.elements
        )
          .map((inline) =>
            inline.type === 'link' ? (inline.text ?? inline.url) : inline.text
          )
          .join('')
          .replace(/\n$/, '')
      );
      expect(texts).toEqual([expected, expected, expected, expected]);
      expect(table.rows[1]).toEqual([{ type: 'raw_text', text: expected }]);
    }
  );

  it('quotes one level, a hard break as a line break', () => {
    expect(
      outline(
        markdownContentToSlackBlocks(
          md.blockquote(
            md.paragraph('> a', md.break(), md.strong('b')),
            md.heading(2, '# c'),
            md.blockquote(md.paragraph('d'))
          )
        )
      )
    ).toEqual(['quote: > a\n[bold:b]\n[bold:# c]\nd']);
  });

  it('keeps a quote holding code, a list, or a table on the tree, bordered', () => {
    expect(
      outline(
        markdownContentToSlackBlocks(
          md.blockquote(
            md.paragraph('a'),
            md.codeBlock('*x*'),
            md.list(['c']),
            md.table(['h'], [['1']]),
            md.blockquote(md.paragraph('d'))
          )
        )
      )
    ).toEqual([
      'quote: a',
      'preformatted|: *x*',
      'list|: c',
      'table: h / 1',
      'quote: d',
    ]);
  });

  it('reads a quote in a list item as the item content', () => {
    expect(
      outline(
        markdownContentToSlackBlocks(
          md.list([
            [
              md.paragraph('i'),
              md.blockquote(md.paragraph('q', md.break(), 'r'), md.list(['n'])),
            ],
          ])
        )
      )
    ).toEqual(['list: i\nq\nr', 'list: n']);
  });

  it('quotes Markdown printed as written, its code and lists bordered', () => {
    expect(
      outline(
        markdownContentToSlackBlocks(
          md.blockquote(
            markdownFromString('**e**\n\nf\n\n```\n*g*\n```'),
            md.list([[md.paragraph('h'), md.table(['i'], [])]])
          )
        )
      )
    ).toEqual([
      'quote: [bold:e]\nf',
      'preformatted|: *g*',
      'list|: h',
      'table: i',
    ]);
  });

  it('lifts a table out of a list item and resumes the list after it', () => {
    expect(
      outline(
        markdownContentToSlackBlocks([
          md.list([
            [
              md.paragraph('a', md.break(), 'b'),
              md.blockquote(md.paragraph('q')),
              md.table(['h'], []),
            ],
          ]),
          md.list([
            md.paragraph('c', md.break(), 'd'),
            markdownFromString('x'),
          ]),
        ])
      )
    ).toEqual(['list: a\nb\nq', 'table: h', 'list: c\nd / x']);
  });

  it('links only an absolute URL in quotes, list items, and multi-run cells', () => {
    const payload = JSON.stringify(
      markdownContentToSlackBlocks([
        md.blockquote(
          md.paragraph(
            md.link('a', '/p'),
            md.break(),
            md.link('b', 'https://b.c')
          ),
          md.list([[md.paragraph(md.link('c', './c'))]]),
          markdownFromString('[d](/d) [e](https://e.f)')
        ),
        md.list([
          [
            md.paragraph('i'),
            md.blockquote(md.paragraph(md.image('g', '/g.png'))),
          ],
        ]),
        md.table(['h'], [[[md.link('x', '#'), md.link('y', 'https://y.z')]]]),
      ])
    );
    expect(
      [...payload.matchAll(/"url":"([^"]*)"|<([^|>]*)\|/g)].map(
        ([, url, mrkdwn]) => url ?? mrkdwn
      )
    ).toEqual(['https://b.c', 'https://e.f', 'https://y.z']);
    for (const label of ['"a"', '"c"', '"d"', '"g"', '"x"']) {
      expect(payload).toContain(label);
    }
  });

  it('carries a multi-run table cell and the label forms as styles', () => {
    expect(
      outline(
        markdownContentToSlackBlocks([
          md.paragraph(md.strong('LABEL')),
          md.paragraph(md.strong('Key'), ': value'),
          md.table(
            ['h', 'i'],
            [
              [
                ['a', md.strong('b')],
                ['c', 'd'],
              ],
            ]
          ),
        ])
      )
    ).toEqual([
      'section: [bold:LABEL]\n',
      'section: [bold:Key]: value',
      'table: h | i / section: a[bold:b] | cd',
    ]);
  });

  it('clamps a section to the section text budget', () => {
    const [block] = markdownContentToSlackBlocks(
      md.paragraph('a'.repeat(SLACK_LIMITS.sectionTextChars), md.strong('b'))
    );
    expect(block).toMatchObject({
      elements: [
        { elements: [{ text: 'a'.repeat(SLACK_LIMITS.sectionTextChars) }] },
      ],
    });
  });

  it('keeps a full section and its line break within the budget', () => {
    const [block] = markdownContentToSlackBlocks([
      md.paragraph('a'.repeat(SLACK_LIMITS.sectionTextChars)),
      md.paragraph('b'),
    ]);
    if (block?.type !== 'rich_text') {
      throw new Error('expected rich text');
    }
    const [first] = block.elements;
    const length =
      first?.type === 'rich_text_section'
        ? first.elements
            .map((inline) =>
              inline.type === 'link' ? (inline.text ?? inline.url) : inline.text
            )
            .join('').length
        : 0;
    expect(length).toBe(SLACK_LIMITS.sectionTextChars);
  });

  it('bolds a heading inside a list item as it does at the top level', () => {
    const [block] = markdownContentToSlackBlocks(md.list([md.heading(3, 'h')]));
    expect(block).toMatchObject({
      elements: [
        { elements: [{ elements: [{ text: 'h', style: { bold: true } }] }] },
      ],
    });
  });

  it('numbers a list authored from 0 from 1, sending no negative offset', () => {
    const [block] = markdownContentToSlackBlocks(
      md.list(['a'], { ordered: true, start: 0 })
    );
    expect(block).toMatchObject({ elements: [{ style: 'ordered' }] });
    expect(JSON.stringify(block)).not.toContain('offset');
  });

  it('keeps a first grapheme when one character of the budget is left', () => {
    const budget = SLACK_LIMITS.sectionTextChars;
    const [styled] = markdownContentToSlackBlocks(
      md.paragraph('a'.repeat(budget - 1), md.strong('bc'))
    );
    expect(styled).toMatchObject({
      elements: [{ elements: [{}, { text: 'b', style: { bold: true } }] }],
    });
    const [bare] = markdownContentToSlackBlocks(
      md.paragraph('a'.repeat(budget - 1), md.link('', 'https://a.b'))
    );
    expect(bare).toMatchObject({
      elements: [{ elements: [{}, { type: 'link', text: 'h' }] }],
    });
  });

  it('keeps list item content in source order around a nested list', () => {
    const [block] = markdownContentToSlackBlocks(
      md.list([
        [md.paragraph('before'), md.list(['inner']), md.paragraph('after')],
        'next',
      ])
    );
    expect(block).toMatchObject({
      elements: [
        {
          type: 'rich_text_list',
          elements: [{ elements: [{ text: 'before' }] }],
        },
        { type: 'rich_text_list', indent: 1 },
        { type: 'rich_text_section', elements: [{ text: 'after' }] },
        {
          type: 'rich_text_list',
          elements: [{ elements: [{ text: 'next' }] }],
        },
      ],
    });
  });

  it('gives no number to an item holding only a nested list', () => {
    const [block] = markdownContentToSlackBlocks(
      md.list([md.list(['inner']), 'next'], { ordered: true })
    );
    expect(block).toMatchObject({
      elements: [
        { style: 'bullet', indent: 1 },
        { style: 'ordered', elements: [{ elements: [{ text: 'next' }] }] },
      ],
    });
    expect(block).not.toMatchObject({ elements: [{}, { offset: 1 }] });
  });

  it('prints a list item holding only a table as the table', () => {
    expect(
      outline(
        markdownContentToSlackBlocks(
          md.list([[md.table(['A', 'B'], [['1', '2']])]])
        )
      )
    ).toEqual(['table: A | B / 1 | 2']);
  });

  it('prints nothing for a table with no columns and drops a row with no cells', () => {
    expect(markdownContentToSlackBlocks(md.table([], []))).toEqual([]);
    expect(markdownContentToSlackBlocks(md.table(['a'], [[]]))).toEqual([
      {
        type: 'table',
        rows: [[{ type: 'raw_text', text: 'a' }]],
        column_settings: [{ align: 'left', is_wrapped: true }],
      },
    ]);
  });

  it('caps list indent at the Slack maximum and keeps every item', () => {
    const depth = SLACK_LIMITS.richTextListMaxIndent + 3;
    let nested = md.list([`d${depth}`]);
    for (let level = depth - 1; level >= 0; level -= 1) {
      nested = md.list([[md.paragraph(`d${level}`), nested]]);
    }
    const [block] = markdownContentToSlackBlocks(nested);
    if (block?.type !== 'rich_text') {
      throw new Error('expected rich text');
    }
    const lists = block.elements.filter(
      (element) => element.type === 'rich_text_list'
    );
    expect(
      lists.every(
        (list) => (list.indent ?? 0) <= SLACK_LIMITS.richTextListMaxIndent
      )
    ).toBe(true);
    expect(lists.map((list) => list.indent ?? 0)).toContain(
      SLACK_LIMITS.richTextListMaxIndent
    );
    const texts = JSON.stringify(block);
    for (let level = 0; level <= depth; level += 1) {
      expect(texts).toContain(`"d${level}"`);
    }
  });

  it.each([0, 1])(
    'keeps a table to the row and column limits, %i past each',
    (over) => {
      const columns = Array.from(
        { length: SLACK_LIMITS.tableColumns + over },
        (_, index) => `c${index}`
      );
      const rows = Array.from(
        { length: SLACK_LIMITS.tableRows - 1 + over },
        (_, index) => columns.map(() => String(index))
      );
      const [table] = markdownContentToSlackBlocks(md.table(columns, rows));
      if (table?.type !== 'table') {
        throw new Error('expected a table');
      }
      expect(table.rows).toHaveLength(SLACK_LIMITS.tableRows);
      expect(
        table.rows.every((row) => row.length === SLACK_LIMITS.tableColumns)
      ).toBe(true);
      expect(table.column_settings).toHaveLength(SLACK_LIMITS.tableColumns);
      expect(table.rows[0]?.at(-1)).toEqual({
        type: 'raw_text',
        text: `c${SLACK_LIMITS.tableColumns - 1}`,
      });
    }
  );

  it('drops an empty paragraph or code block', () => {
    expect(
      markdownContentToSlackBlocks([md.paragraph(''), md.codeBlock('')])
    ).toEqual([]);
  });

  it('indents a nested list and resumes the outer list at its next number', () => {
    const [block] = markdownContentToSlackBlocks(
      md.list(
        [[md.paragraph('a'), md.paragraph('a2'), md.list(['a.i'])], 'b'],
        { ordered: true, start: 3 }
      )
    );
    expect(block).toEqual({
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_list',
          style: 'ordered',
          offset: 2,
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                { type: 'text', text: 'a' },
                { type: 'text', text: '\n' },
                { type: 'text', text: 'a2' },
              ],
            },
          ],
        },
        {
          type: 'rich_text_list',
          style: 'bullet',
          indent: 1,
          elements: [
            {
              type: 'rich_text_section',
              elements: [{ type: 'text', text: 'a.i' }],
            },
          ],
        },
        {
          type: 'rich_text_list',
          style: 'ordered',
          offset: 3,
          elements: [
            {
              type: 'rich_text_section',
              elements: [{ type: 'text', text: 'b' }],
            },
          ],
        },
      ],
    });
  });

  it('reads Markdown printed as written, and a block holding it, as GFM', () => {
    expect(
      outline(
        markdownContentToSlackBlocks([
          md.paragraph('built'),
          md.list([markdownFromString('**legacy**'), 'x']),
          md.authored('_authored_'),
        ])
      )
    ).toEqual([
      'section: built',
      'list: [bold:legacy] / x',
      'section: [italic:authored]',
    ]);
  });
});

describe('gfmToSlackBlocks', () => {
  it.each<[string, string, string[]]>([
    [
      'nests strong in emphasis',
      '***a** b*',
      ['section: [italic,bold:a][italic: b]'],
    ],
    [
      'nests emphasis of one delimiter',
      '*a *b* c*',
      ['section: [italic:a ][italic:b][italic: c]'],
    ],
    [
      'keeps an intraword underscore',
      'snake_case_name',
      ['section: snake_case_name'],
    ],
    ['reads a tilde fence', '~~~\n*x*\n~~~', ['preformatted: *x*']],
    ['reads indented code', '    *x*', ['preformatted: *x*']],
    ['continues a quote lazily', '> a\nb', ['quote: a\nb']],
    [
      'keeps a backslash before a heading',
      'a\\\n# h',
      ['section: a\\\n', 'section: [bold:h]'],
    ],
    [
      'keeps a backslash before a list',
      'a\\\n- b',
      ['section: a\\', 'list: b'],
    ],
    [
      'keeps a backslash before a fence',
      'a\\\n```\nc\n```',
      ['section: a\\', 'preformatted: c'],
    ],
    [
      'reads a quote and a fence in list items',
      '- a\n  > q\n- b\n  ```\n  c\n  ```',
      ['list: a\nq / b\n[code:c]'],
    ],
    [
      'resolves escapes and references',
      '\\*a\\* &#42; &amp;',
      ['section: *a* * &'],
    ],
    [
      'prints a thematic break as a divider',
      'a\n\n---\n\nb',
      ['section: a', 'divider', 'section: b'],
    ],
    ['prints raw HTML as text', '<div>x</div>', ['section: <div>x</div>']],
    [
      'labels a footnote',
      'x[^1]\n\n[^1]: note',
      ['section: x[^1]\n', 'section: [^1]: note'],
    ],
  ])('%s', (_name, gfm, expected) => {
    expect(outline(gfmToSlackBlocks(gfm))).toEqual(expected);
    expect(gfmToSlackBlocks(gfm.replaceAll('\n', '\r\n'))).toEqual(
      gfmToSlackBlocks(gfm)
    );
  });

  it('labels a footnote in a plain table cell', () => {
    expect(outline(gfmToSlackBlocks('| x[^1] |\n| - |\n\n[^1]: n'))).toEqual([
      'table: x[^1]',
      'section: [^1]: n',
    ]);
  });

  it('leads a task item with its box', () => {
    expect(
      outline(gfmToSlackBlocks('- [x] done\n- [ ] todo\n\n  more\n- plain'))
    ).toEqual(['list: ☑ done / ☐ todo\nmore / plain']);
  });

  it('gives no number to an item holding only a table', () => {
    const blocks = gfmToSlackBlocks('1. a\n2. | t |\n   | - |\n3. c');
    expect(outline(blocks)).toEqual(['list: a', 'table: t', 'list: c']);
    expect(blocks[2]).toMatchObject({
      elements: [{ type: 'rich_text_list', style: 'ordered', offset: 1 }],
    });
  });

  it('nests a list indented by a tab', () => {
    const [block] = gfmToSlackBlocks('- a\n\n\t- b');
    expect(block).toMatchObject({
      elements: [
        { type: 'rich_text_list' },
        { type: 'rich_text_list', indent: 1 },
      ],
    });
  });

  it('resolves link and image references to their first definition', () => {
    const payload = JSON.stringify(
      gfmToSlackBlocks(
        '[a][r] ![i][r]\n\n[r]: https://a.b/i.png\n[r]: https://c.d'
      )
    );
    expect(
      [...payload.matchAll(/"url":"([^"]*)"/g)].map(([, url]) => url)
    ).toEqual(['https://a.b/i.png', 'https://a.b/i.png']);
    expect(payload).not.toContain('https://c.d');
  });

  it('links only an absolute URL, after decoding its destination', () => {
    const payload = JSON.stringify(
      gfmToSlackBlocks(
        '[x](javascript:alert(1)) [y](&#106;avascript:x) [z](/p) [w](https://a.b/a\\|b)'
      )
    );
    expect(
      [...payload.matchAll(/"url":"([^"]*)"/g)].map(([, url]) => url)
    ).toEqual(['https://a.b/a|b']);
  });

  it('prints source past the parse budget as literal paragraphs', () => {
    const blocks = gfmToSlackBlocks(`${'**x** '.repeat(4_000)}\n\n_y_`);
    const [first, second] = outline(blocks);
    expect(first).toMatch(/^section: \*\*x\*\* \*\*x\*\*/);
    expect(second).toBe('section: _y_');
  });

  it('translates adversarial source in bounded time', () => {
    const inputs = [
      '*a '.repeat(2_000),
      '['.repeat(16_000),
      '`'.repeat(16_000),
      `${'> '.repeat(120)}x`,
      `${'- '.repeat(120)}x`,
      '| a |\n| - |\n'.repeat(1_000),
    ];
    const started = performance.now();
    for (const input of inputs) {
      gfmToSlackBlocks(input);
    }
    expect(performance.now() - started).toBeLessThan(2_000);
  });

  it('drops whitespace-only source', () => {
    expect(gfmToSlackBlocks('\n\n  \n')).toEqual([]);
  });
});
