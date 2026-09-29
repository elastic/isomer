/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  type MarkdownBlock,
  type MarkdownContent,
  markdownContent,
} from '../../define/markdown_content';
import { markdownFromString, md, serializeMarkdown } from '../markdown/builder';

import { SLACK_LIMITS } from './blocks';
import { gfmToSlackBlocks } from './format';
import { markdownContentToSlackBlocks } from './markdown_content';

const mrkdwn = (content: MarkdownContent): string | undefined => {
  const [block] = markdownContentToSlackBlocks(content);
  return block?.type === 'section' ? block.text?.text : undefined;
};

const LOOKALIKE_RE = /[∗ˍ∼ˋ]/g;
const ORIGINALS: Record<string, string> = {
  '∗': '*',
  ˍ: '_',
  '∼': '~',
  ˋ: '`',
};
const withoutLookalikes = (content: unknown): string =>
  JSON.stringify(content).replace(LOOKALIKE_RE, (char) => ORIGINALS[char]!);

const INPUTS = [
  'line\nbreak',
  'back\\slash',
  'trailing\\',
  '[x](javascript:alert(1))',
  '<b>bold</b> & more',
  '*star* and _under_',
  '**strong** and __strong__',
  '~strike~ and `tick`',
  'a | b',
  '# heading',
  '- item',
  '1. item',
  '    indented',
  '> quote',
  '&amp; &#x41;',
  '<https://a.b> and www.x.com',
];

const PLACEMENTS: readonly [string, (input: string) => MarkdownContent][] = [
  ['paragraph', (input) => md.paragraph(input)],
  ['heading', (input) => md.heading(2, input)],
  ['strong', (input) => md.paragraph(md.strong(input))],
  ['emphasis', (input) => md.paragraph(md.emphasis(input))],
  ['list', (input) => md.list([input, md.list([input])], { ordered: true })],
  ['table', (input) => md.table(['h', input], [[input, '1']])],
  ['link', (input) => md.paragraph(md.link(input, 'https://x.y/?q=a|b'))],
  [
    'code',
    (input) => [md.paragraph(md.code(input)), md.codeBlock(input, 'js')],
  ],
];

describe('markdownContentToSlackBlocks', () => {
  describe.each(PLACEMENTS)('in a %s', (_placement, place) => {
    it.each(INPUTS)(
      'matches the serialized path but for lookalikes: %j',
      (input) => {
        const content = place(input);
        expect(withoutLookalikes(markdownContentToSlackBlocks(content))).toBe(
          withoutLookalikes(gfmToSlackBlocks(serializeMarkdown(content)))
        );
      }
    );
  });

  it('prints a literal pair Slack would format as a lookalike', () => {
    expect(mrkdwn(md.paragraph('_y_ *note* ~x~ `c`'))).toBe(
      'ˍy_ ∗note* ∼x~ ˋc`'
    );
    expect(
      mrkdwn(md.paragraph(md.strong('a *b'), ' ', md.emphasis('_c d_')))
    ).toBe('*a ∗b* _ˍc dˍ_');
    expect(mrkdwn(md.heading(1, 'a* b'))).toBe('*a∗ b*');
  });

  it('keeps identifiers and lone delimiters Slack would not pair', () => {
    const text = '_id, _source, snake_case, user_agent.original, 2*3, a * b';
    expect(mrkdwn(md.paragraph(text))).toBe(text);
    expect(mrkdwn(md.paragraph(md.strong('a*b')))).toBe('*a*b*');
  });

  it('prints a style nested in itself once', () => {
    expect(
      mrkdwn(
        md.paragraph(
          md.emphasis('a ', md.emphasis('b')),
          ' ',
          md.strong(md.emphasis(md.strong('x'))),
          ' ',
          md.strong('')
        )
      )
    ).toBe('_a b_ *_x_* ');
    expect(mrkdwn(md.heading(3, 'a ', md.strong('b')))).toBe('*a b*');
  });

  it('translates links, images, and code, applying the URL policy', () => {
    expect(
      mrkdwn(
        md.paragraph(
          md.link(md.strong('x'), 'https://a.b'),
          ' ',
          md.link('y', 'javascript:alert(1)'),
          ' ',
          md.image('alt', 'https://a.b/i.png'),
          ' ',
          md.image('gone', 'javascript:alert(1)'),
          ' ',
          md.code('a`b')
        )
      )
    ).toBe('<https://a.b|x> y <https://a.b/i.png|alt> gone `aˋb`');
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
        { type: 'image', url: 'javascript:alert(1)', alt: ' alt ' },
        { type: 'html', value: '<b>' },
        { type: 'unknown', children: [{ type: 'text', value: '_z_' }] },
      ],
      [markdownContent]: 'block',
    } as unknown as MarkdownBlock;
    expect(mrkdwn(forged)).toBe('x alt &lt;b&gt;ˍz_');
  });

  it('merges printed-as-written content into the surrounding prose', () => {
    expect(
      markdownContentToSlackBlocks([
        md.paragraph('a'),
        markdownFromString('**b**\n\n```\nc\n```\n\nd'),
        md.paragraph('e'),
        md.list([md.authored('*f*')]),
      ])
    ).toEqual([
      { type: 'section', text: { type: 'mrkdwn', text: 'a\n\n*b*' } },
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_preformatted',
            elements: [{ type: 'text', text: 'c' }],
          },
        ],
      },
      { type: 'section', text: { type: 'mrkdwn', text: 'd\n\ne\n\n- _f_' } },
    ]);
  });

  it('clamps section text and tables to the Slack limits', () => {
    expect(
      mrkdwn(md.paragraph('x'.repeat(SLACK_LIMITS.sectionTextChars + 10)))
    ).toMatch(/^x{2999}…$/);
    const columns = Array.from({ length: 25 }, (_, index) => `c${index}`);
    const [table] = markdownContentToSlackBlocks(
      md.table(
        columns,
        Array.from({ length: 120 }, () => columns)
      )
    );
    expect(
      table?.type === 'table' && [
        table.rows.length,
        table.rows[0]?.length,
        table.column_settings?.length,
      ]
    ).toEqual([
      SLACK_LIMITS.tableRows,
      SLACK_LIMITS.tableColumns,
      SLACK_LIMITS.tableColumns,
    ]);
  });
});
