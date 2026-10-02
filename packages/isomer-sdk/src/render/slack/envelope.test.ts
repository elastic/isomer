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

    const over = 'y'.repeat(limit * 2 + 5);
    const cluster = `e${'\u0301'.repeat(limit + 5)}`;
    it('reads the long cluster as one grapheme', () => {
      const graphemes = new Intl.Segmenter(undefined, {
        granularity: 'grapheme',
      }).segment(cluster);
      expect([...graphemes]).toHaveLength(1);
    });
    it.each<[string, SlackRichTextInline]>([
      ['a text run', text(over, { italic: true })],
      ['a link label', { type: 'link', url: 'https://x.test', text: over }],
      ['a link URL', { type: 'link', url: `https://x.test/${over}` }],
      ['a tag', { type: 'tag', text: over, color: 'red' }],
      ['one grapheme', text(cluster)],
    ])(
      'splits %s past a section’s limit into inlines of its own type',
      (_name, inline) => {
        const [, degraded] = degrade([
          [cell('')],
          [rich(section(text('a'), inline, text('b')))],
        ]);
        const { elements } = degraded as SlackRichTextBlock;
        const whole = elementText(section(inline));
        expect(elements.map(elementText).join('')).toBe(`a${whole}b`);
        const pieces = elements.flatMap((element) => {
          expect(element.type).toBe('rich_text_section');
          expect(elementText(element).length).toBeLessThanOrEqual(limit);
          return (element as SlackRichTextSection).elements;
        });
        for (const piece of pieces.slice(1, -1)) {
          expect({ ...piece, text: undefined }).toEqual({
            ...inline,
            text: undefined,
          });
        }
      }
    );

    const grid = (height: number, width: number): SlackTableBlock => ({
      type: 'table',
      rows: Array.from({ length: height }, () =>
        Array.from({ length: width }, () => cell('c'))
      ),
    });
    it.each([
      ['keeps a table at the row limit', SLACK_LIMITS.tableRows, 1, 'table'],
      [
        'degrades a table one row past',
        SLACK_LIMITS.tableRows + 1,
        1,
        'rich_text',
      ],
      [
        'keeps a table at the column limit',
        2,
        SLACK_LIMITS.tableColumns,
        'table',
      ],
      [
        'degrades a table one column past',
        2,
        SLACK_LIMITS.tableColumns + 1,
        'rich_text',
      ],
    ])('%s', (_name, height, width, type) => {
      expect(render([grid(height, width)]).map((block) => block.type)).toEqual([
        type,
      ]);
    });

    it.each<[string, SlackTableCell[][], SlackRichTextBlockElement[]]>([
      ['an empty table', [], []],
      ['a table of empty rows', [[], []], []],
      ['a header with empty cells and no rows', [[cell(''), rich()], []], []],
      [
        'empty rows after the header',
        [[cell('H')], [], [cell('a')], []],
        [section(...lead('H'), text('a'))],
      ],
      [
        'only empty rows after the header',
        [[cell('H')], []],
        [section(strong('H'))],
      ],
      [
        'an empty header and empty elements in a cell',
        [[], [rich(section(), quote, { ...list, elements: [] })]],
        [quote],
      ],
      [
        'empty rows, cells, and elements mixed',
        [[cell('H'), cell('')], [], [rich(section()), cell('b')], [cell('c')]],
        [
          section(...lead('H'), text('\n')),
          section(text('b'), text('\n')),
          blank,
          section(...lead('H'), text('c')),
        ],
      ],
    ])('sends %s through the fallback', (_name, rows, elements) => {
      expect(render([{ type: 'table', rows }])).toEqual(
        elements.length === 0 ? [] : [{ type: 'rich_text', elements }]
      );
    });

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

describe('Slack envelope count limits', () => {
  const mrkdwn = (text: string) => ({ type: 'mrkdwn' as const, text });
  const render = (blocks: SlackBlock[]) =>
    renderSlackEnvelope(
      { type: 'view', body: [{ type: 'n' }] },
      dispatcherFor([blocks])
    ).blocks;

  it('splits a context past its element limit', () => {
    const elements = Array.from({ length: 12 }, (_, i) => mrkdwn(`c${i}`));
    const blocks = render([{ type: 'context', block_id: 'ctx', elements }]);
    expect(
      blocks.map((b) => b.type === 'context' && b.elements.length)
    ).toEqual([10, 2]);
    expect(blocks.map((b) => b.block_id)).toEqual(['ctx', undefined]);
  });

  it('splits section fields past the field limit, text staying on the first', () => {
    const fields = Array.from({ length: 12 }, (_, i) => mrkdwn(`f${i}`));
    const blocks = render([
      { type: 'section', text: mrkdwn('T'), fields },
    ]).filter((b) => b.type === 'section' && b.fields);
    expect(
      blocks.map(
        (b) => b.type === 'section' && [b.text?.text, b.fields?.length]
      )
    ).toEqual([
      ['T', 10],
      [undefined, 2],
    ]);
  });

  it('splits actions past the button limit', () => {
    const elements = Array.from({ length: 30 }, (_, i) => button(`b${i}`));
    const blocks = render([{ type: 'actions', elements }]).filter(
      (b) => b.type === 'actions'
    );
    expect(
      blocks.map((b) => b.type === 'actions' && b.elements.length)
    ).toEqual([25, 5]);
  });

  it('caps the options of a menu', () => {
    const options = Array.from({ length: 7 }, (_, i) => ({
      ...option(`o${i}`),
      value: `v${i}`,
    }));
    const [block] = render([
      {
        type: 'actions',
        elements: [{ type: 'overflow', action_id: 'a', options }],
      },
    ]).filter((b) => b.type === 'actions');
    expect(
      block?.type === 'actions' &&
        block.elements[0]?.type === 'overflow' &&
        block.elements[0].options
    ).toHaveLength(SLACK_LIMITS.optionsPerOverflow);
  });

  it('caps radio buttons and checkboxes at the choice limit', () => {
    const options = Array.from({ length: 12 }, (_, i) => ({
      ...option(`o${i}`),
      value: `v${i}`,
    }));
    const [block] = render([
      {
        type: 'actions',
        elements: [
          {
            type: 'checkboxes',
            action_id: 'c',
            options,
            initial_options: [options[11]!],
          },
        ],
      },
    ]).filter((b) => b.type === 'actions');
    const [element] = block?.type === 'actions' ? block.elements : [];
    expect(
      element?.type === 'checkboxes' && [
        element.options.length,
        element.initial_options,
      ]
    ).toEqual([SLACK_LIMITS.optionsPerChoice, undefined]);
  });

  it('drops an image whose URL is past the URL limit', () => {
    const image_url = `https://x.test/${'a'.repeat(SLACK_LIMITS.imageUrlChars)}`;
    const blocks = render([{ type: 'image', image_url, alt_text: 'chart' }]);
    expect(blocks).toEqual([{ type: 'context', elements: [mrkdwn('chart')] }]);
  });

  it('keeps every block exactly at its limits', () => {
    const image_url = `https://x.test/${'a'.repeat(SLACK_LIMITS.imageUrlChars - 15)}`;
    expect(image_url).toHaveLength(SLACK_LIMITS.imageUrlChars);
    const options = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        ...option(`o${i}`),
        value: `v${i}`,
      }));
    const input: SlackBlock[] = [
      { type: 'image', image_url, alt_text: 'chart' },
      {
        type: 'context',
        elements: Array.from({ length: SLACK_LIMITS.contextElements }, (_, i) =>
          mrkdwn(`c${i}`)
        ),
      },
      {
        type: 'section',
        fields: Array.from({ length: SLACK_LIMITS.fieldsPerSection }, (_, i) =>
          mrkdwn(`f${i}`)
        ),
      },
      {
        type: 'actions',
        elements: [
          ...Array.from(
            { length: SLACK_LIMITS.buttonsPerActions - 2 },
            (_, i) => button(`b${i}`)
          ),
          {
            type: 'overflow',
            action_id: 'o',
            options: options(SLACK_LIMITS.optionsPerOverflow),
          },
          {
            type: 'checkboxes',
            action_id: 'c',
            options: options(SLACK_LIMITS.optionsPerChoice),
          },
        ],
      },
    ];
    const output = render(input).filter(
      (block) =>
        block.type !== 'divider' && !(block.type === 'section' && block.text)
    );
    expect(output).toEqual(input);
  });

  it('degrades a context image element past the URL limit to its alt text, or drops it', () => {
    const image_url = `https://x.test/${'a'.repeat(SLACK_LIMITS.imageUrlChars)}`;
    expect(
      render([
        {
          type: 'context',
          elements: [
            { type: 'image', image_url, alt_text: 'chart' },
            { type: 'image', image_url, alt_text: '' },
            mrkdwn('note'),
          ],
        },
      ])
    ).toEqual([
      { type: 'context', elements: [mrkdwn('chart'), mrkdwn('note')] },
    ]);
    expect(
      render([
        {
          type: 'context',
          elements: [{ type: 'image', image_url, alt_text: '' }],
        },
      ])
    ).toEqual([]);
  });

  it('cuts option values and action ids, and drops a URL past its limit', () => {
    const long = (n: number) => 'v'.repeat(n + 1);
    const [block] = render([
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: plain('Go'),
            action_id: long(SLACK_LIMITS.actionIdChars),
            value: long(SLACK_LIMITS.buttonValueChars),
            url: `https://x.test/${long(SLACK_LIMITS.urlChars)}`,
          },
          {
            type: 'static_select',
            action_id: 's',
            options: [
              { ...option('A'), value: long(SLACK_LIMITS.optionValueChars) },
            ],
            initial_option: {
              ...option('A'),
              value: long(SLACK_LIMITS.optionValueChars),
            },
          },
        ],
      },
    ]).filter((b) => b.type === 'actions');
    const [go, select] = block?.type === 'actions' ? block.elements : [];
    expect(go).toEqual({
      type: 'button',
      text: plain('Go'),
      action_id: 'v'.repeat(SLACK_LIMITS.actionIdChars),
      value: 'v'.repeat(SLACK_LIMITS.buttonValueChars),
    });
    const value = 'v'.repeat(SLACK_LIMITS.optionValueChars);
    expect(select?.type === 'static_select' && select.options?.[0]?.value).toBe(
      value
    );
    expect(
      select?.type === 'static_select' && select.initial_option?.value
    ).toBe(value);
  });

  it('keeps the alt text of a section accessory past the URL limit', () => {
    const image_url = `https://x.test/${'a'.repeat(SLACK_LIMITS.imageUrlChars)}`;
    const blocks = render([
      {
        type: 'section',
        text: mrkdwn('T'),
        accessory: { type: 'image', image_url, alt_text: 'chart' },
      },
    ]);
    expect(blocks).toEqual([
      { type: 'section', text: mrkdwn('T') },
      { type: 'context', elements: [mrkdwn('chart')] },
    ]);
  });

  it('caps option groups and the options in each', () => {
    const group = (g: number) => ({
      label: plain(`g${g}`),
      options: Array.from({ length: 101 }, (_, i) => ({
        ...option(`o${i}`),
        value: `g${g}o${i}`,
      })),
    });
    const [block] = render([
      {
        type: 'actions',
        elements: [
          {
            type: 'static_select',
            action_id: 's',
            option_groups: Array.from({ length: 101 }, (_, g) => group(g)),
          },
        ],
      },
    ]).filter((b) => b.type === 'actions');
    const [select] = block?.type === 'actions' ? block.elements : [];
    const groups =
      select?.type === 'static_select' ? (select.option_groups ?? []) : [];
    expect(groups).toHaveLength(SLACK_LIMITS.optionGroupsPerSelect);
    expect(groups.every(({ options }) => options.length === 100)).toBe(true);
  });

  it('replaces an initial option with the emitted option of its value', () => {
    const emitted = { ...option('Shown'), value: 'v1' };
    const [block] = render([
      {
        type: 'actions',
        elements: [
          {
            type: 'static_select',
            action_id: 's',
            option_groups: [{ label: plain('g'), options: [emitted] }],
            initial_option: { ...option('Different'), value: 'v1' },
          },
        ],
      },
    ]).filter((b) => b.type === 'actions');
    const [select] = block?.type === 'actions' ? block.elements : [];
    expect(select?.type === 'static_select' && select.initial_option).toEqual(
      emitted
    );
  });

  it('splits one actions block into consecutive blocks with no dividers between them', () => {
    const elements = Array.from({ length: 626 }, (_, i) => button(`b${i}`));
    const blocks = render([section('lead'), { type: 'actions', elements }]);
    const actions = blocks.filter((b) => b.type === 'actions');
    expect(actions).toHaveLength(26);
    expect(blocks.filter((b) => b.type === 'divider')).toHaveLength(1);
    expect(
      actions.reduce(
        (sum, b) => sum + (b.type === 'actions' ? b.elements.length : 0),
        0
      )
    ).toBe(626);
  });
});

describe('Slack envelope mrkdwn clamping', () => {
  const clamped = (text: string): string => {
    const [block] = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'n' }] },
      dispatcherFor([[section(text)]])
    ).blocks;
    return block?.type === 'section' ? (block.text?.text ?? '') : '';
  };
  const max = SLACK_LIMITS.sectionTextChars;

  it('cuts before a link rather than inside it', () => {
    const text = `${'a'.repeat(max - 10)} <https://x.test/long/path|label> tail`;
    expect(clamped(text)).toBe(`${'a'.repeat(max - 10)}…`);
  });

  it('cuts before an entity rather than inside it', () => {
    const text = `${'a'.repeat(max - 3)}&amp;&amp;`;
    expect(clamped(text)).toBe(`${'a'.repeat(max - 3)}…`);
  });

  it('leaves formatting marks as they fall', () => {
    const output = clamped(`*${'b '.repeat(max)}*`);
    expect(output.length).toBeLessThanOrEqual(max);
    expect(output.endsWith(' b…')).toBe(true);
  });

  it('does not treat an intraword underscore as an opener', () => {
    const output = clamped(`snake_case ${'w'.repeat(max)}`);
    expect(output.endsWith('…')).toBe(true);
  });
});

describe('Slack envelope fallback text', () => {
  it('escapes the default text render as mrkdwn', () => {
    const { text } = renderSlackEnvelope(
      { type: 'view', title: 'A <b> & c', body: [] },
      dispatcherFor([])
    );
    expect(text).toBe('A &lt;B&gt; &amp; C');
  });

  it('passes a host-supplied text through as mrkdwn', () => {
    const { text } = renderSlackEnvelope(
      { type: 'view', body: [] },
      dispatcherFor([]),
      {
        text: '*bold* <https://x.test|x>',
      }
    );
    expect(text).toBe('*bold* <https://x.test|x>');
  });
});

describe('pack-authored rich text', () => {
  const max = SLACK_LIMITS.sectionTextChars;
  const sectionOf = (text: string): SlackRichTextSection => ({
    type: 'rich_text_section',
    elements: [{ type: 'text', text }],
  });
  const textOf = (element: SlackRichTextBlockElement): string =>
    element.type === 'rich_text_list'
      ? ''
      : element.elements
          .map((inline) => ('text' in inline ? (inline.text ?? '') : ''))
          .join('');
  const fitted = (element: SlackRichTextBlockElement): SlackBlock[] =>
    renderSlackEnvelope(
      { type: 'view', body: [{ type: 'a' }] },
      dispatcherFor([[{ type: 'rich_text', elements: [element] }]])
    ).blocks;

  it('keeps an element within the limit as is', () => {
    const element = sectionOf('x'.repeat(max));
    expect(fitted(element)).toEqual([
      { type: 'rich_text', elements: [element] },
    ]);
  });

  it('splits a section past the limit into adjacent sections of one block', () => {
    const text = 'x'.repeat(max * 2 + 1);
    const [block, ...rest] = fitted(sectionOf(text));
    expect(rest).toEqual([]);
    const parts = block?.type === 'rich_text' ? block.elements : [];
    expect(parts.map(({ type }) => type)).toEqual([
      'rich_text_section',
      'rich_text_section',
      'rich_text_section',
    ]);
    expect(parts.every((part) => textOf(part).length <= max)).toBe(true);
    expect(parts.map(textOf).join('')).toBe(text);
  });

  it('keeps a list as is', () => {
    const list: SlackRichTextList = {
      type: 'rich_text_list',
      style: 'bullet',
      elements: [sectionOf('x'.repeat(max + 1))],
    };
    expect(fitted(list)).toEqual([{ type: 'rich_text', elements: [list] }]);
  });
});
