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
  SlackTableBlock,
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

  it('degrades a table that exceeds the message-wide cell budget', () => {
    const over = SLACK_LIMITS.tableCellCharsPerMessage + 1;
    const { blocks } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'table' }] },
      dispatcherFor([[tableBlock(over)]])
    );
    expect(blocks.some((block) => block.type === 'table')).toBe(false);
    expect(blocks.some((block) => block.type === 'rich_text')).toBe(true);
  });

  it('keeps every cell of a table past the aggregate budget whole and literal', () => {
    const half = SLACK_LIMITS.tableCellCharsPerMessage / 2;
    const text = `*${'x'.repeat(half)}_~\``;
    const second: SlackTableBlock = {
      type: 'table',
      rows: [
        [cell('H'), cell('I')],
        [
          cell(text),
          {
            type: 'rich_text',
            elements: [
              {
                type: 'rich_text_section',
                elements: [{ type: 'text', text: 'y', style: { code: true } }],
              },
            ],
          },
        ],
      ],
    };
    const { blocks } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'a' }, { type: 'b' }] },
      dispatcherFor([[tableBlock(half)], [second]])
    );
    expect(blocks.filter((block) => block.type === 'table')).toHaveLength(1);
    expect(blocks.at(-1)).toEqual({
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            { type: 'text', text: 'H', style: { bold: true } },
            { type: 'text', text: ': ' },
            { type: 'text', text },
            { type: 'text', text: '\n' },
            { type: 'text', text: 'I', style: { bold: true } },
            { type: 'text', text: ': ' },
            { type: 'text', text: 'y', style: { code: true } },
          ],
        },
      ],
    });
  });

  it('keeps a styled heading and drops the separator for an empty one past the aggregate budget', () => {
    const half = SLACK_LIMITS.tableCellCharsPerMessage / 2;
    const code = {
      type: 'rich_text' as const,
      elements: [
        {
          type: 'rich_text_section' as const,
          elements: [
            { type: 'text' as const, text: 'iOS', style: { code: true } },
          ],
        },
      ],
    };
    const matrix: SlackTableBlock = {
      type: 'table',
      rows: [
        [cell(''), code],
        [cell('x'.repeat(half)), cell('Yes')],
      ],
    };
    const { blocks } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'a' }, { type: 'b' }] },
      dispatcherFor([[tableBlock(half)], [matrix]])
    );
    expect(blocks.at(-1)).toEqual({
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            { type: 'text', text: 'x'.repeat(half) },
            { type: 'text', text: '\n' },
            { type: 'text', text: 'iOS', style: { code: true, bold: true } },
            { type: 'text', text: ': ' },
            { type: 'text', text: 'Yes' },
          ],
        },
      ],
    });
  });

  it('keeps the sections, list items, quotes, and preformatted blocks of a cell past the aggregate budget', () => {
    const half = SLACK_LIMITS.tableCellCharsPerMessage / 2;
    const text = (value: string) => ({ type: 'text' as const, text: value });
    const section = (value: string) => ({
      type: 'rich_text_section' as const,
      elements: [text(value)],
    });
    const list = {
      type: 'rich_text_list' as const,
      style: 'bullet' as const,
      elements: [section('first'), section('second')],
    };
    const quote = {
      type: 'rich_text_quote' as const,
      elements: [text('quoted')],
    };
    const preformatted = {
      type: 'rich_text_preformatted' as const,
      elements: [text('code')],
    };
    const structured: SlackTableBlock = {
      type: 'table',
      rows: [
        [cell('A'), cell('B')],
        [
          {
            type: 'rich_text',
            elements: [section('x'.repeat(half)), section('two'), list],
          },
          { type: 'rich_text', elements: [quote, preformatted] },
        ],
      ],
    };
    const { blocks } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'a' }, { type: 'b' }] },
      dispatcherFor([[tableBlock(half)], [structured]])
    );
    const bold = (value: string) => ({
      ...text(value),
      style: { bold: true },
    });
    expect(blocks.at(-1)).toEqual({
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            bold('A'),
            text(': '),
            text('x'.repeat(half)),
            text('\n'),
            text('two'),
          ],
        },
        list,
        { type: 'rich_text_section', elements: [bold('B'), text(': ')] },
        quote,
        preformatted,
      ],
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
