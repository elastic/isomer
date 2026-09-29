/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { markdownFromString, md } from '../markdown/builder';
import { SAFE_INPUTS } from '../markdown/safe_inputs.fixtures';

import { SLACK_LIMITS } from './blocks';
import { markdownContentToSlackBlocks } from './markdown_content';

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
            { type: 'link', url: 'https://a.b', text: 'a b' },
            { type: 'link', url: 'https://c.d' },
            { type: 'link', url: 'https://e.f/i.png', text: 'alt' },
            { type: 'text', text: 'data' },
          ],
        },
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
      expect(texts).toEqual([expected, expected, expected]);
      expect(table.rows[1]).toEqual([{ type: 'raw_text', text: expected }]);
    }
  );

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

  it('sends Markdown printed as written, and a block holding it, through the string path', () => {
    expect(
      markdownContentToSlackBlocks([
        md.paragraph('built'),
        md.list([markdownFromString('**legacy**'), 'x']),
        md.authored('_authored_'),
      ])
    ).toEqual([
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [{ type: 'text', text: 'built' }],
          },
        ],
      },
      { type: 'section', text: { type: 'mrkdwn', text: '- *legacy*\n- x' } },
      { type: 'section', text: { type: 'mrkdwn', text: '_authored_' } },
    ]);
  });
});
