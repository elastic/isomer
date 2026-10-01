/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Nodes, Root } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import { describe, expect, it } from 'vitest';

import { oneLine } from '../../composition/one_line';
import {
  type MarkdownBlock,
  type MarkdownContent,
  markdownContent,
} from '../../define/markdown_content';
import { gfmToSlackBlocks } from '../slack/format';

import {
  boldLabelPrefix,
  boldSectionLabel,
  markdownFromString,
  md,
  serializeMarkdown,
} from './builder';
import { SAFE_INPUTS } from './safe_inputs.fixtures';

const parse = (markdown: string): Root =>
  fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });

const read = (content: MarkdownContent): Root =>
  parse(serializeMarkdown(content));

const descendants = (node: Nodes): Nodes[] => [
  node,
  ...('children' in node ? node.children.flatMap(descendants) : []),
];

const textOf = (node: Nodes): string =>
  'value' in node
    ? node.value
    : 'children' in node
      ? node.children.map(textOf).join('')
      : '';

const typesIn = (root: Root): string[] =>
  descendants(root).map(({ type }) => type);

const trim = (text: string): string => text.trim();

// Where each input lands, the node its text should come back in, and that text.
const PLACEMENTS: readonly [
  string,
  (input: string) => MarkdownContent,
  string,
  ((text: string) => string)?,
][] = [
  ['paragraph', (input) => md.paragraph(input), 'paragraph'],
  [
    'paragraph around a hard break',
    (input) => md.paragraph(input, md.break(), input),
    'paragraph',
    (text) => text + text,
  ],
  ['blockquote', (input) => md.blockquote(md.paragraph(input)), 'paragraph'],
  ['heading', (input) => md.heading(2, input), 'heading'],
  ['strong', (input) => md.paragraph(md.strong(input)), 'strong'],
  ['emphasis', (input) => md.paragraph(md.emphasis(input)), 'emphasis'],
  ['list item', (input) => md.list([input]), 'paragraph'],
  ['table cell', (input) => md.table(['h'], [[input]]), 'tableCell', trim],
  [
    'multi-run table cell',
    (input) => md.table(['h'], [[[input, input]]]),
    'tableCell',
    (text) => trim(text + text),
  ],
  [
    'link label',
    (input) => md.paragraph(md.link(input, 'https://x.y')),
    'link',
  ],
];

const LIVE_TYPES = new Set([
  'link',
  'image',
  'html',
  'emphasis',
  'strong',
  'delete',
  'inlineCode',
  'linkReference',
  'imageReference',
  'footnoteReference',
  'definition',
]);

// GFM autolinks a bare URL whatever precedes it; that link is the author's text.
const AUTOLINK_INPUT_RE = /www\.|https?:\/\/|@/;

describe('md', () => {
  describe.each(PLACEMENTS)('in a %s', (_placement, place, container, text) => {
    it.each(SAFE_INPUTS)('keeps %j as text', (input) => {
      const root = read(place(input));
      const holder = descendants(root)
        .filter(({ type }) => type === container)
        .at(-1);
      const expected = oneLine(input);
      expect(holder && textOf(holder)).toBe(text?.(expected) ?? expected);

      const live = descendants(root).filter(
        (node) => LIVE_TYPES.has(node.type) && node.type !== container
      );
      for (const node of live) {
        expect(AUTOLINK_INPUT_RE.test(input) && node.type === 'link').toBe(
          true
        );
        expect(node.type === 'link' && /^(https?|mailto):/.test(node.url)).toBe(
          true
        );
      }
    });
  });

  it.each(SAFE_INPUTS)(
    'reaches Slack with no escape or reference the serializer added: %j',
    (input) => {
      const json = JSON.stringify(
        gfmToSlackBlocks(
          serializeMarkdown([md.paragraph(input), md.table(['h'], [[input]])])
        )
      );
      if (!input.includes('&#')) {
        expect(json).not.toContain('&#');
      }
      if (!input.includes('\\')) {
        // A backslash in the text is `\\` in JSON.
        expect(json).not.toMatch(/\\\\[!-/:-@[-`{-~]/);
      }
    }
  );

  it('escapes a trailing `!` before a link, so no image forms', () => {
    const root = read(md.paragraph('wow!', md.link('x', 'https://a.b')));
    expect(typesIn(root)).toContain('link');
    expect(typesIn(root)).not.toContain('image');
  });

  it('keeps emphasis beside word characters as emphasis', () => {
    const root = read(md.paragraph('a', md.emphasis('b'), 'c'));
    expect(textOf(root)).toBe('abc');
    expect(typesIn(root)).toContain('emphasis');
  });

  it('reaches Slack intact when a wrapper holds code containing its delimiter', () => {
    const markdown = serializeMarkdown(
      md.paragraph(
        md.strong(md.code('a**b')),
        ' ',
        md.emphasis(md.code('c_d')),
        ' ',
        md.link(md.code('e]f'), 'https://a.b')
      )
    );
    expect(gfmToSlackBlocks(markdown)).toEqual([
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*`a**b`* _`c_d`_ <https://a.b|e]f>',
        },
      },
    ]);
  });

  it('reaches Slack as a bare link for an empty link label or image alt', () => {
    const markdown = serializeMarkdown(
      md.paragraph(
        md.link('', 'https://a.b'),
        ' ',
        md.image('', 'https://a.b/i.png')
      )
    );
    expect(gfmToSlackBlocks(markdown)).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '<https://a.b> <https://a.b/i.png>' },
      },
    ]);
  });

  it('prints nested strong and emphasis unambiguously, and Slack nests them', () => {
    const markdown = serializeMarkdown(
      md.paragraph(
        md.strong(md.emphasis('x')),
        ' ',
        md.strong('a ', md.emphasis('b'), ' c'),
        ' ',
        md.emphasis('d ', md.strong('e')),
        ' ',
        md.emphasis(md.strong('f'))
      )
    );
    expect(markdown).toBe('**_x_** **a _b_ c** _d **e**_ _**f**_');
    expect(gfmToSlackBlocks(markdown)).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*_x_* *a _b_ c* _d *e*_ _*f*_' },
      },
    ]);
  });

  it('applies the URL policy to links and images', () => {
    expect(
      serializeMarkdown(md.paragraph(md.link('x', 'javascript:alert(1)')))
    ).toBe('[x](#)');
    expect(
      serializeMarkdown(md.paragraph(md.image('alt', 'javascript:alert(1)')))
    ).toBe('alt');
    expect(
      serializeMarkdown(md.paragraph(md.image('a', 'https://a.b/i.png')))
    ).toBe('![a](https://a.b/i.png)');
  });

  it('applies the URL policy again to content built outside `md`', () => {
    const forged = {
      type: 'paragraph',
      children: [
        {
          type: 'link',
          url: 'javascript:alert(1)',
          children: [{ type: 'text', value: 'x' }],
        },
        { type: 'image', url: 'javascript:alert(1)', alt: 'alt' },
        { type: 'html', value: '<script>alert(1)</script>' },
      ],
      [markdownContent]: 'block',
    } as unknown as MarkdownBlock;
    const definition = {
      type: 'definition',
      identifier: 'a',
      label: 'a',
      url: 'javascript:alert(1)',
      [markdownContent]: 'block',
    } as unknown as MarkdownBlock;
    const markdown = serializeMarkdown([forged, definition]);
    expect(markdown).not.toMatch(/javascript/);
    expect(typesIn(parse(markdown))).not.toContain('html');
  });

  it('prints sanitized authored Markdown between builder blocks', () => {
    expect(
      serializeMarkdown([
        md.heading(2, 'Title'),
        md.authored('a *b*\n\n[x](javascript:alert(1))'),
        md.paragraph('c'),
      ])
    ).toBe('## Title\n\na *b*\n\nx\n\nc');
  });

  it('prints no markers for empty inline content', () => {
    expect(
      serializeMarkdown(
        md.paragraph(
          'a',
          md.strong(''),
          md.emphasis(md.strong()),
          md.code(''),
          'b'
        )
      )
    ).toBe('ab');
  });

  it('adds no blank lines for trailing whitespace in printed-as-written content', () => {
    expect(serializeMarkdown([md.authored('a\n\n\n'), md.paragraph('b')])).toBe(
      'a\n\nb'
    );
    expect(serializeMarkdown(markdownFromString('x\r\n\n  '))).toBe('x');
    expect(serializeMarkdown(markdownFromString('\n \n'))).toBe('');
  });

  it('builds tight lists and indents a nested multi-line string', () => {
    expect(serializeMarkdown(md.list(['one', 'two']))).toBe('- one\n- two');
    expect(
      serializeMarkdown(md.list([markdownFromString('line1\nline2'), 'b']))
    ).toBe('- line1\n  line2\n- b');
    expect(
      serializeMarkdown(md.list(['a', 'b'], { ordered: true, start: 3 }))
    ).toBe('3. a\n4. b');
    expect(serializeMarkdown(markdownFromString(''))).toBe('');
  });

  it('ignores a list start GFM would not read as a list number', () => {
    for (const start of [1.5, -1, Number.POSITIVE_INFINITY, 999_999_999]) {
      expect(
        serializeMarkdown(md.list(['a', 'b'], { ordered: true, start }))
      ).toBe('1. a\n2. b');
    }
    expect(
      serializeMarkdown(
        md.list(['a', 'b'], { ordered: true, start: 999_999_998 })
      )
    ).toBe('999999998. a\n999999999. b');
    expect(serializeMarkdown(md.list(['a'], { ordered: true, start: 0 }))).toBe(
      '0. a'
    );
  });

  it('fences code past any backtick run inside it and drops an unsafe language', () => {
    const inline = read(md.paragraph(md.code('a`b')));
    expect(
      descendants(inline).find(({ type }) => type === 'inlineCode')
    ).toMatchObject({ value: 'a`b' });
    const block = read(md.codeBlock('```\ninner', 'js`x'));
    expect(block.children[0]).toMatchObject({
      type: 'code',
      lang: null,
      value: '```\ninner',
    });
  });

  it('prints compact tables with escaped pipes', () => {
    const markdown = serializeMarkdown(md.table(['a|b', 'c'], [['1', ' 2 ']]));
    expect(markdown.split('\n').slice(0, 2)).toEqual([
      '| a\\|b | c |',
      '| - | - |',
    ]);
    const cells = descendants(parse(markdown))
      .filter(({ type }) => type === 'tableCell')
      .map(textOf);
    expect(cells).toEqual(['a|b', 'c', '1', '2']);
  });

  it('prints a whitespace run holding a line terminator as one space, in text and code', () => {
    expect(serializeMarkdown(md.paragraph('a \r\n  b'))).toBe('a b');
    expect(serializeMarkdown(md.paragraph(md.code('a \n\n b')))).toBe('`a b`');
    expect(serializeMarkdown(md.paragraph('a  b'))).toBe('a  b');
  });

  it('breaks a paragraph line with a backslash, prints a space elsewhere, and drops an edge break', () => {
    expect(serializeMarkdown(md.paragraph('a', md.break(), 'b'))).toBe(
      'a\\\nb'
    );
    expect(
      serializeMarkdown(md.paragraph(md.break(), 'a', md.break(), ''))
    ).toBe('a');
    expect(
      serializeMarkdown([
        md.heading(3, md.break(), 'a', md.break(), 'b'),
        md.paragraph(md.strong('c', md.break(), 'd', md.break())),
        md.paragraph(
          md.emphasis(md.break(), 'g'),
          md.link(['h', md.break()], 'https://a.b')
        ),
        md.table([[md.break(), 'e', md.break(), 'f', md.break()]], []),
      ])
    ).toBe('### a b\n\n**c d**\n\n_g_[h](https://a.b)\n\n| e f |\n| - |');
  });

  it('quotes builder blocks and embedded content, and drops an empty quote', () => {
    const markdown = serializeMarkdown([
      md.blockquote(
        md.paragraph('# a'),
        md.list(['b']),
        markdownFromString('c\n\nd'),
        md.blockquote(md.paragraph('> e'))
      ),
      md.blockquote(markdownFromString('')),
    ]);
    expect(markdown).toBe('> \\# a\n>\n> - b\n>\n> c\n>\n> d\n>\n> > \\> e');
    const [quote] = parse(markdown).children;
    expect(quote?.type === 'blockquote' && quote.children.map(textOf)).toEqual([
      '# a',
      'b',
      'c',
      'd',
      '> e',
    ]);
  });

  it('keeps code, strong, and pipes in one multi-run cell', () => {
    const root = read(
      md.table(['h'], [[[md.code('a|b'), ' | ', md.strong('c|d')]]])
    );
    const cell = descendants(root).filter(
      ({ type }) => type === 'tableCell'
    )[1];
    expect(cell).toMatchObject({
      children: [
        { type: 'inlineCode', value: 'a|b' },
        { type: 'text', value: ' | ' },
        { type: 'strong', children: [{ type: 'text', value: 'c|d' }] },
      ],
    });
  });

  it('reaches Slack with no literal escapes, links and tables intact', () => {
    const blocks = gfmToSlackBlocks(
      serializeMarkdown([
        md.paragraph('2*3 # [not] ', md.link('x_y', 'https://a.b/c|d')),
        md.table(['a|b'], [['1.']]),
        md.codeBlock('```\ninner'),
      ])
    );
    expect(blocks[0]).toEqual({
      type: 'section',
      text: { type: 'mrkdwn', text: '2*3 # [not] <https://a.b/c%7Cd|x_y>' },
    });
    expect(blocks[1]).toMatchObject({
      type: 'table',
      rows: [[{ text: 'a|b' }], [{ text: '1.' }]],
    });
    expect(blocks[2]).toMatchObject({
      type: 'rich_text',
      elements: [{ elements: [{ text: '```\ninner' }] }],
    });
  });
});

describe('label helpers', () => {
  it('escapes the label they bold', () => {
    expect(boldSectionLabel('a*b')).toBe('**A\\*B**');
    expect(boldLabelPrefix('2*3: six', '2*3')).toBe('**2\\*3**: six');
  });

  it('build the same labels as content, escaping the text too', () => {
    expect(
      serializeMarkdown([
        md.boldSectionLabel('a*b'),
        md.paragraph(...md.boldLabelPrefix('2*3: six*', '2*3')),
        md.paragraph(...md.boldLabelPrefix('x: *y*', 'z')),
      ])
    ).toBe('**A\\*B**\n\n**2\\*3**: six\\*\n\nx: \\*y\\*');
  });
});
