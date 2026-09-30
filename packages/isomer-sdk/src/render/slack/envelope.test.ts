/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { DefaultPackTypes } from '../../define/primitive_module';
import type {
  CaptionNode,
  FixtureNode,
  GroupNode,
} from '../../testing/sdk.fixtures';
import { fixtureDefinitions } from '../../testing/sdk.fixtures';
import { createPrimitiveDispatcher } from '../primitive_dispatch';

import type { SlackAssetCollector } from './assets';
import type {
  SlackActionElement,
  SlackBlock,
  SlackButtonElement,
  SlackOptionObject,
  SlackPlainTextObject,
  SlackRichTextBlock,
  SlackRichTextBlockElement,
  SlackRichTextInline,
  SlackRichTextList,
  SlackRichTextSection,
  SlackRichTextStyle,
  SlackTableBlock,
  SlackTableCell,
  SlackVideoBlock,
} from './blocks';
import { SLACK_LIMITS } from './blocks';
import { renderSlackEnvelope, type SlackEnvelopeDispatcher } from './envelope';

interface SlackPackTypes extends DefaultPackTypes {
  slackBlock: SlackBlock;
  slackCollector: SlackAssetCollector;
}

const degradingDispatcher = (
  options: { collectAssets?: boolean } = {}
): SlackEnvelopeDispatcher<FixtureNode> =>
  createPrimitiveDispatcher<FixtureNode, SlackPackTypes>(fixtureDefinitions, {
    ...(options.collectAssets
      ? { isSlackAssetType: (type: string) => type === 'chart' }
      : {}),
  });

const mrkdwnOf = (blocks: readonly SlackBlock[]): string =>
  blocks
    .map((block) => (block.type === 'section' ? (block.text?.text ?? '') : ''))
    .join('\n');

const section = (text: string): SlackBlock => ({
  type: 'section',
  text: { type: 'mrkdwn', text },
});

const fieldSection = (text: string): SlackBlock => ({
  type: 'section',
  fields: [{ type: 'mrkdwn', text }],
});

const dispatcherFor = (
  blocks: ReadonlyArray<readonly SlackBlock[]>
): SlackEnvelopeDispatcher<{ type: string }> => {
  let index = 0;
  return {
    renderText: (node) => node.type,
    renderMarkdown: (node) => node.type,
    renderSlack: () => blocks[index++] ?? [],
  };
};

const plain = (text: string): SlackPlainTextObject => ({
  type: 'plain_text',
  text,
});

const option = (text: string): SlackOptionObject => ({
  text: plain(text),
  value: 'v',
});

const long = 'x'.repeat(SLACK_LIMITS.optionTextChars + 1);

const button = (text: string): SlackButtonElement => ({
  type: 'button',
  text: plain(text),
});

const actions = (element: SlackActionElement): SlackBlock => ({
  type: 'actions',
  elements: [element],
});

const video = (fields: Partial<SlackVideoBlock>): SlackBlock => ({
  type: 'video',
  title: plain('V'),
  video_url: 'https://x.test/v',
  thumbnail_url: 'https://x.test/t.png',
  alt_text: 'V',
  ...fields,
});

const cell = (text: string) => ({ type: 'raw_text' as const, text });

const tableBlock = (cellChars: number): SlackTableBlock => ({
  type: 'table',
  rows: [[cell('H')], [cell('x'.repeat(cellChars))]],
});

describe('Slack envelope transforms', () => {
  it('coalesces consecutive one-field sections into a fields grid', () => {
    const { blocks } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'a' }, { type: 'b' }] },
      dispatcherFor([[fieldSection('A')], [fieldSection('B')]])
    );
    const fields = blocks.filter((block) => block.type === 'section');
    expect(fields).toEqual([
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: 'A' },
          { type: 'mrkdwn', text: 'B' },
        ],
      },
    ]);
  });

  it('opens with the body in the blocks and the fallback text when heading is false', () => {
    const { text, blocks } = renderSlackEnvelope(
      {
        type: 'view',
        title: 'Checkout',
        subtitle: 'last 15m',
        body: [{ type: 'a' }],
      },
      dispatcherFor([[section('A')]]),
      { heading: false }
    );
    expect(blocks).toEqual([section('A')]);
    expect(text).toBe('a');
  });

  it('inserts spacers between consecutive content sections', () => {
    const { blocks } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'a' }, { type: 'b' }] },
      dispatcherFor([[section('A')], [section('B')]])
    );
    expect(blocks).toEqual([
      section('A'),
      { type: 'section', text: { type: 'mrkdwn', text: ' ' } },
      section('B'),
    ]);
  });

  describe('the message-wide table cell budget', () => {
    const budget = SLACK_LIMITS.tableCellCharsPerMessage;
    const limit = SLACK_LIMITS.sectionTextChars;
    const text = (value: string, style?: SlackRichTextStyle) => ({
      type: 'text' as const,
      text: value,
      ...(style && { style }),
    });
    const strong = (value: string) => text(value, { bold: true });
    const section = (
      ...elements: SlackRichTextInline[]
    ): SlackRichTextSection => ({ type: 'rich_text_section', elements });
    const rich = (
      ...elements: SlackRichTextBlockElement[]
    ): SlackTableCell => ({
      type: 'rich_text',
      elements,
    });
    const list: SlackRichTextList = {
      type: 'rich_text_list',
      style: 'bullet',
      elements: [section(text('first')), section(text('second'))],
    };
    const quote: SlackRichTextBlockElement = {
      type: 'rich_text_quote',
      elements: [text('quoted')],
    };
    const preformatted: SlackRichTextBlockElement = {
      type: 'rich_text_preformatted',
      elements: [text('code')],
    };
    const inlines: SlackRichTextInline[] = [
      text('run', { code: true }),
      text(' and ', { bold: true }),
      { type: 'link', url: 'https://x.test', text: 'link' },
      { type: 'tag', text: 'tag', color: 'red' },
    ];
    const blank = section(text('\n'));
    const lead = (heading: string) => [strong(heading), text(': ')];

    const render = (tables: SlackTableBlock[]) =>
      renderSlackEnvelope(
        { type: 'view', body: tables.map(() => ({ type: 'table' })) },
        dispatcherFor(tables.map((table) => [table]))
      ).blocks.filter((block) => block.type !== 'section');
    // The first table spends the whole budget, so the second degrades.
    const degrade = (rows: SlackTableCell[][]) =>
      render([tableBlock(budget - 1), { type: 'table', rows }]);

    const elementText = (element: SlackRichTextBlockElement): string =>
      element.type === 'rich_text_list'
        ? element.elements.map(elementText).join('')
        : element.elements
            .map((inline) =>
              inline.type === 'link' ? (inline.text ?? inline.url) : inline.text
            )
            .join('');
    const cellTexts = (cell: SlackTableCell): string[] =>
      cell.type === 'raw_text' ? [cell.text] : cell.elements.map(elementText);

    it.each<[string, SlackTableCell[][], SlackRichTextBlockElement[]]>([
      [
        'plain cells, rows parted by a blank section',
        [
          [cell('H'), cell('I')],
          [cell('a'), cell('b')],
          [cell('c'), cell('d')],
        ],
        [
          section(...lead('H'), text('a'), text('\n')),
          section(...lead('I'), text('b'), text('\n')),
          blank,
          section(...lead('H'), text('c'), text('\n')),
          section(...lead('I'), text('d')),
        ],
      ],
      [
        'rich inlines in a cell and a heading',
        [
          [rich(section(text('iOS', { code: true })))],
          [rich(section(...inlines))],
        ],
        [
          section(
            text('iOS', { code: true, bold: true }),
            text(': '),
            ...inlines
          ),
        ],
      ],
      [
        'empty and blank headings',
        [
          [cell(''), cell('  '), cell('H')],
          [cell('a'), cell('b'), cell('c')],
        ],
        [
          section(text('a'), text('\n')),
          section(text('b'), text('\n')),
          section(...lead('H'), text('c')),
        ],
      ],
      [
        'a heading with blocks',
        [[rich(list)], [cell('a')]],
        [
          {
            ...list,
            elements: [section(strong('first')), section(strong('second'))],
          },
          section(text('a')),
        ],
      ],
      [
        'sections, a list, a quote, and preformatted text in cells',
        [
          [cell('A'), cell('B')],
          [
            rich(section(text('one')), section(text('two')), list),
            rich(quote, preformatted),
          ],
        ],
        [
          section(...lead('A'), text('one'), text('\n')),
          section(text('two')),
          list,
          section(...lead('B')),
          quote,
          preformatted,
        ],
      ],
      ...[list, quote, preformatted].map(
        (block): [string, SlackTableCell[][], SlackRichTextBlockElement[]] => [
          `rows that end and start with a ${block.type}`,
          [[cell('')], [rich(block)], [rich(block)]],
          [block, blank, block],
        ]
      ),
      [
        'a row wider than the header',
        [[cell('A')], [cell('a'), cell('b')]],
        [section(...lead('A'), text('a'), text('\n')), section(text('b'))],
      ],
      [
        'a row narrower than the header',
        [[cell('A'), cell('B')], [cell('a')]],
        [section(...lead('A'), text('a'), text('\n')), section(...lead('B'))],
      ],
      [
        'a header with no rows',
        [[cell('A'), cell(''), rich(section(text('B', { code: true })))]],
        [
          section(strong('A'), text('\n')),
          section(text('B', { code: true, bold: true })),
        ],
      ],
      [
        'a cell past a section’s limit, split without a break',
        [[cell('H')], [cell('x'.repeat(limit + 2000))]],
        [
          section(...lead('H'), text('x'.repeat(limit - 3))),
          section(text('x'.repeat(2003))),
        ],
      ],
      [
        'a link whole when it would cross a section’s limit',
        [[cell('')], [rich(section(text('x'.repeat(limit - 2)), inlines[2]!))]],
        [section(text('x'.repeat(limit - 2))), section(inlines[2]!)],
      ],
      [
        'every shape at once',
        [
          [cell(''), rich(section(text('K', { code: true })))],
          [cell('row'), rich(quote), cell('extra')],
          [rich(list)],
        ],
        [
          section(text('row'), text('\n')),
          section(text('K', { code: true, bold: true }), text(': ')),
          quote,
          section(text('extra'), text('\n')),
          blank,
          list,
          section(text('K', { code: true, bold: true }), text(': ')),
        ],
      ],
    ])('keeps %s', (_name, rows, elements) => {
      const blocks = degrade(rows);
      expect(blocks.map(({ type }) => type)).toEqual(['table', 'rich_text']);
      const degraded = blocks[1] as SlackRichTextBlock;
      expect(degraded).toEqual({ type: 'rich_text', elements });
      const all = degraded.elements.map(elementText).join('');
      for (const source of rows.flat()) {
        for (const piece of cellTexts(source)) {
          expect(all).toContain(piece.trim());
        }
      }
      for (const element of degraded.elements) {
        if (element.type !== 'rich_text_list') {
          expect(elementText(element).length).toBeLessThanOrEqual(limit);
        }
      }
    });

    const endings = ['\n', '\r\n', '\r', '\u2028', '\u2029'];
    const ending = (value: string): [string, SlackRichTextInline][] => [
      ['text', text(value)],
      ['link text', { type: 'link', url: 'https://x.test', text: value }],
      ['link url', { type: 'link', url: `https://x.test/${value}` }],
      ['tag', { type: 'tag', text: value }],
    ];
    const breakCase = (
      name: string,
      last: SlackRichTextInline[],
      broken: boolean
    ): [string, SlackRichTextInline[], boolean] => [name, last, broken];

    it.each([
      ...endings.flatMap((end) =>
        ending(`a${end}`).map(([type, inline]) =>
          breakCase(
            `a ${type} ending in ${JSON.stringify(end)}`,
            [inline],
            false
          )
        )
      ),
      ...ending('a').map(([type, inline]) =>
        breakCase(`a ${type} ending in text`, [inline], true)
      ),
      breakCase(
        'an empty run after a line end',
        [text('a\n'), text('')],
        false
      ),
    ])(
      'breaks a section before the next only when %s does not end its line',
      (_name, last, broken) => {
        expect(
          degrade([
            [cell(''), cell('')],
            [rich(section(...last)), cell('b')],
          ]).at(-1)
        ).toEqual({
          type: 'rich_text',
          elements: [
            section(...last, ...(broken ? [text('\n')] : [])),
            section(text('b')),
          ],
        });
      }
    );

    it.each([
      ['keeps tables that fit exactly', [4999, 4999], ['table', 'table']],
      ['degrades the table one past', [4999, 5000], ['table', 'rich_text']],
      ['degrades one table alone over', [budget], ['rich_text']],
      [
        'keeps a later table that fits what is left',
        [5999, 5999, 3999],
        ['table', 'rich_text', 'table'],
      ],
    ])('%s', (_name, sizes, types) => {
      const tables = sizes.map(tableBlock);
      const blocks = render(tables);
      expect(blocks.map(({ type }) => type)).toEqual(types);
      blocks.forEach((block, index) => {
        if (block.type === 'table') {
          expect(block).toBe(tables[index]);
        }
      });
    });
  });

  it('produces a valid header for a title over the header limit', () => {
    const { blocks } = renderSlackEnvelope(
      {
        type: 'view',
        title: 'T'.repeat(SLACK_LIMITS.headerTextChars + 1),
        body: [],
      },
      dispatcherFor([])
    );
    const [header] = blocks;
    expect(header?.type === 'header' && header.text.text).toHaveLength(
      SLACK_LIMITS.headerTextChars
    );
  });

  it.each<[string, number, (text: string) => SlackBlock]>([
    [
      'header text',
      SLACK_LIMITS.headerTextChars,
      (text) => ({ type: 'header', text: plain(text) }),
    ],
    ['section text', SLACK_LIMITS.sectionTextChars, section],
    ['section field', SLACK_LIMITS.sectionFieldChars, fieldSection],
    [
      'accessory button text',
      SLACK_LIMITS.buttonTextChars,
      (text) => ({ ...section('S'), accessory: button(text) }),
    ],
    [
      'accessory image alt text',
      SLACK_LIMITS.imageAltTextChars,
      (text) => ({
        ...section('S'),
        accessory: {
          type: 'image',
          image_url: 'https://x.test/a.png',
          alt_text: text,
        },
      }),
    ],
    [
      'context text element',
      SLACK_LIMITS.contextElementChars,
      (text) => ({ type: 'context', elements: [{ type: 'mrkdwn', text }] }),
    ],
    [
      'context image alt text',
      SLACK_LIMITS.imageAltTextChars,
      (text) => ({
        type: 'context',
        elements: [
          { type: 'image', image_url: 'https://x.test/a.png', alt_text: text },
        ],
      }),
    ],
    [
      'image alt text',
      SLACK_LIMITS.imageAltTextChars,
      (text) => ({
        type: 'image',
        image_url: 'https://x.test/a.png',
        alt_text: text,
      }),
    ],
    [
      'image title',
      SLACK_LIMITS.imageTitleChars,
      (text) => ({
        type: 'image',
        image_url: 'https://x.test/a.png',
        alt_text: 'A',
        title: plain(text),
      }),
    ],
    [
      'video title',
      SLACK_LIMITS.videoTitleChars,
      (text) => video({ title: plain(text) }),
    ],
    [
      'video description',
      SLACK_LIMITS.videoDescriptionChars,
      (text) => video({ description: plain(text) }),
    ],
    [
      'video author name',
      SLACK_LIMITS.videoAuthorNameChars,
      (text) => video({ author_name: text }),
    ],
    [
      'actions button text',
      SLACK_LIMITS.buttonTextChars,
      (text) => actions(button(text)),
    ],
    [
      'select placeholder',
      SLACK_LIMITS.placeholderChars,
      (text) =>
        actions({
          type: 'static_select',
          action_id: 's',
          placeholder: plain(text),
          options: [option('O')],
        }),
    ],
    [
      'option text',
      SLACK_LIMITS.optionTextChars,
      (text) =>
        actions({ type: 'overflow', action_id: 'o', options: [option(text)] }),
    ],
    [
      'option description',
      SLACK_LIMITS.optionTextChars,
      (text) =>
        actions({
          type: 'radio_buttons',
          action_id: 'r',
          options: [{ ...option('O'), description: plain(text) }],
        }),
    ],
    [
      'option group label',
      SLACK_LIMITS.optionGroupLabelChars,
      (text) =>
        actions({
          type: 'static_select',
          action_id: 's',
          option_groups: [{ label: plain(text), options: [option('O')] }],
        }),
    ],
    [
      'grouped option text',
      SLACK_LIMITS.optionTextChars,
      (text) =>
        actions({
          type: 'static_select',
          action_id: 's',
          option_groups: [{ label: plain('G'), options: [option(text)] }],
        }),
    ],
  ])('clamps a pack-emitted %s to its limit', (_, limit, build) => {
    const { blocks } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'a' }] },
      dispatcherFor([[build('x'.repeat(limit + 1))]])
    );
    const json = JSON.stringify(blocks);
    expect(json).toContain(`"${'x'.repeat(limit - 1)}…"`);
    expect(json).not.toContain('x'.repeat(limit));
  });

  it.each<[string, SlackActionElement]>([
    [
      'static_select',
      {
        type: 'static_select',
        action_id: 's',
        options: [option(long)],
        initial_option: option(long),
      },
    ],
    [
      'radio_buttons',
      {
        type: 'radio_buttons',
        action_id: 'r',
        options: [option(long)],
        initial_option: option(long),
      },
    ],
    [
      'multi_static_select',
      {
        type: 'multi_static_select',
        action_id: 'm',
        options: [option(long)],
        initial_options: [option(long)],
      },
    ],
    [
      'checkboxes',
      {
        type: 'checkboxes',
        action_id: 'c',
        options: [option(long)],
        initial_options: [option(long)],
      },
    ],
  ])('keeps a clamped %s initial option equal to its option', (_, element) => {
    const { blocks } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'a' }] },
      dispatcherFor([[actions(element)]])
    );
    const [block] = blocks;
    const [clamped] = block?.type === 'actions' ? block.elements : [];
    const { options = [] } = clamped && 'options' in clamped ? clamped : {};
    const initial =
      clamped && 'initial_option' in clamped
        ? clamped.initial_option
        : clamped && 'initial_options' in clamped
          ? clamped.initial_options?.[0]
          : undefined;
    expect(options[0]?.text.text).toHaveLength(SLACK_LIMITS.optionTextChars);
    expect(initial).toEqual(options[0]);
  });

  it('elides overflow past the block budget and appends a notice', () => {
    const count = SLACK_LIMITS.blocksPerMessage + 5;
    const { blocks } = renderSlackEnvelope(
      {
        type: 'view',
        body: Array.from({ length: count }, (_, index) => ({
          type: `n${index}`,
        })),
      },
      dispatcherFor(
        Array.from({ length: count }, (_, index) => [section(`N${index}`)])
      )
    );
    expect(blocks.length).toBe(SLACK_LIMITS.blocksPerMessage);
    const last = blocks[blocks.length - 1];
    expect(last?.type).toBe('context');
  });

  it('drops asset uploads whose placeholder blocks were budgeted out', () => {
    const filler = SLACK_LIMITS.blocksPerMessage + 2;
    const { blocks, assets } = renderSlackEnvelope(
      {
        type: 'view',
        body: [
          ...Array.from({ length: filler }, () => ({
            type: 'note' as const,
            body: 'n',
          })),
          { type: 'chart' as const, label: 'Series' },
        ],
      },
      degradingDispatcher({ collectAssets: true }),
      { collectAssets: true }
    );
    expect(assets).toEqual([]);
    expect(
      blocks.some(
        (block) => block.type === 'image' && block.slack_file?.ref !== undefined
      )
    ).toBe(false);
  });

  it('degrades a primitive with no slack renderer, preserving its content', () => {
    const { blocks } = renderSlackEnvelope(
      {
        type: 'view',
        body: [{ type: 'caption', body: 'Aside' } satisfies CaptionNode],
      },
      degradingDispatcher()
    );
    expect(mrkdwnOf(blocks)).toContain('Aside');
  });

  it('degrades a non-renderable child inside a container that renders its siblings', () => {
    // The container's own `slack` renderer returns a non-empty array for the
    // note, so nothing above it can notice the caption was dropped. Degrading
    // has to happen inside the recursion.
    const { blocks } = renderSlackEnvelope(
      {
        type: 'view',
        body: [
          {
            type: 'group',
            items: [
              { type: 'note', body: 'Rendered' },
              { type: 'caption', body: 'Degraded' },
            ],
          } satisfies GroupNode,
        ],
      },
      degradingDispatcher()
    );
    const text = mrkdwnOf(blocks);
    expect(text).toContain('Rendered');
    expect(text).toContain('Degraded');
  });

  it('keeps a node hidden from slack out of the output, including via the fallback', () => {
    const { blocks } = renderSlackEnvelope(
      {
        type: 'view',
        body: [
          {
            type: 'caption',
            body: 'Hidden',
            surfaces: ['text'],
          } satisfies CaptionNode,
        ],
      },
      degradingDispatcher()
    );
    expect(mrkdwnOf(blocks)).not.toContain('Hidden');
  });

  it('does not inject markdown when a slack renderer legitimately renders nothing', () => {
    // `group` has a slack renderer; its only child is hidden from slack, so it
    // returns []. That is "rendered, empty", not "cannot render", and must not
    // be back-filled from markdown — which would leak the hidden child.
    const { blocks } = renderSlackEnvelope(
      {
        type: 'view',
        body: [
          {
            type: 'group',
            items: [
              { type: 'note', body: 'HiddenFromSlack', surfaces: ['text'] },
            ],
          } satisfies GroupNode,
        ],
      },
      degradingDispatcher()
    );
    expect(mrkdwnOf(blocks)).not.toContain('HiddenFromSlack');
  });

  it('degrades a node with no slack renderer through its markdown', () => {
    const { blocks } = renderSlackEnvelope(
      {
        type: 'view',
        body: [{ type: 'caption', body: 'Aside' } satisfies CaptionNode],
      },
      degradingDispatcher()
    );
    expect(mrkdwnOf(blocks)).toContain('Aside');
  });

  it('clamps the alt text it records for an upload, not just the block', () => {
    const label = 'L'.repeat(SLACK_LIMITS.imageAltTextChars + 50);
    const { assets } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'chart', label }] },
      degradingDispatcher({ collectAssets: true }),
      { collectAssets: true }
    );
    expect(assets).toHaveLength(1);
    expect(assets[0]?.altText.length).toBeLessThanOrEqual(
      SLACK_LIMITS.imageAltTextChars
    );
  });

  it('namespaces allocated asset refs when a prefix is given', () => {
    const { blocks, assets } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'chart', label: 'Series' }] },
      degradingDispatcher({ collectAssets: true }),
      { collectAssets: true, assetPrefix: 'charts' }
    );
    expect(assets[0]?.ref).toBe('charts-0');
    expect(blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slack_file: { ref: 'charts-0' } }),
      ])
    );
  });
});
