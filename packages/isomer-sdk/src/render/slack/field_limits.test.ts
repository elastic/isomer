/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type {
  SlackActionElement,
  SlackBlock,
  SlackOptionObject,
  SlackPlainTextObject,
} from './blocks';
import { SLACK_LIMITS } from './blocks';
import type { SlackEnvelopeDispatcher } from './envelope';
import { renderSlackEnvelope } from './envelope';
import { SLACK_FIELD_LIMITS } from './field_limits';
import { slackLimitProblems } from './limit_problems';

// Every number below is Slack's, read from https://docs.slack.dev/reference/block-kit, not from `SLACK_LIMITS`.

const plain = (text: string): SlackPlainTextObject => ({
  type: 'plain_text',
  text,
});

const option = (
  fields: Partial<SlackOptionObject> = {}
): SlackOptionObject => ({
  text: plain('o'),
  value: 'v',
  ...fields,
});

const URL_HEAD = 'https://a.test/';
const urlOf = (length: number): string =>
  URL_HEAD + 'x'.repeat(length - URL_HEAD.length);

const actions = (element: SlackActionElement): SlackBlock => ({
  type: 'actions',
  elements: [element],
});

const fitted = (block: SlackBlock): string => {
  const dispatcher: SlackEnvelopeDispatcher<{ type: string }> = {
    renderText: () => '',
    renderMarkdown: () => '',
    renderSlack: () => [block],
  };
  const result = renderSlackEnvelope(
    { type: 'view', body: [{ type: 'n' }] },
    dispatcher,
    { heading: false, text: 't' }
  );
  return JSON.stringify(result.blocks);
};

interface CharCase {
  name: string;
  /** Slack's maximum, as its docs give it. */
  max: number;
  /** How the envelope fits one past it: `clamp` ends in `…`, `cut` keeps `max` characters, `drop` removes it, `degrade` replaces the image with its alt text. */
  fit: 'clamp' | 'cut' | 'drop' | 'degrade';
  /** A block whose field holds `value`. */
  block: (value: string) => SlackBlock;
  /** The field's path in a problem message. */
  where: string;
  url?: boolean;
}

const charCases: CharCase[] = [
  // https://docs.slack.dev/reference/block-kit/blocks/header-block
  {
    name: 'header text',
    max: 150,
    fit: 'clamp',
    block: (text) => ({ type: 'header', text: plain(text) }),
    where: 'blocks[0] (header) text',
  },
  // https://docs.slack.dev/reference/block-kit/blocks/section-block
  {
    name: 'section text',
    max: 3000,
    fit: 'clamp',
    block: (text) => ({ type: 'section', text: { type: 'mrkdwn', text } }),
    where: 'blocks[0] (section) text',
  },
  {
    name: 'section field',
    max: 2000,
    fit: 'clamp',
    block: (text) => ({ type: 'section', fields: [{ type: 'mrkdwn', text }] }),
    where: 'blocks[0] (section) fields[0]',
  },
  // The context block page states no element limit and a text object allows 3000; Isomer holds context text to 2000.
  {
    name: 'context element',
    max: 2000,
    fit: 'clamp',
    block: (text) => ({
      type: 'context',
      elements: [{ type: 'mrkdwn', text }],
    }),
    where: 'blocks[0] (context) elements[0]',
  },
  // https://docs.slack.dev/reference/block-kit/blocks/image-block
  {
    name: 'image block image_url',
    max: 3000,
    fit: 'degrade',
    block: (url) => ({ type: 'image', image_url: url, alt_text: 'alt' }),
    where: 'blocks[0] (image) image_url',
    url: true,
  },
  {
    name: 'image block alt_text',
    max: 2000,
    fit: 'clamp',
    block: (alt) => ({
      type: 'image',
      image_url: 'https://a.test/i.png',
      alt_text: alt,
    }),
    where: 'blocks[0] (image) alt_text',
  },
  {
    name: 'image block title',
    max: 2000,
    fit: 'clamp',
    block: (title) => ({
      type: 'image',
      image_url: 'https://a.test/i.png',
      alt_text: 'alt',
      title: plain(title),
    }),
    where: 'blocks[0] (image) title',
  },
  // https://docs.slack.dev/reference/block-kit/block-elements/image-element
  {
    name: 'image element image_url',
    max: 3000,
    fit: 'degrade',
    block: (url) => ({
      type: 'context',
      elements: [{ type: 'image', image_url: url, alt_text: 'alt' }],
    }),
    where: 'blocks[0] (context) elements[0] image_url',
    url: true,
  },
  // https://docs.slack.dev/reference/block-kit/blocks/video-block ("less than" 200 and 50)
  ...(['title', 'description'] as const).map((field): CharCase => ({
    name: `video ${field}`,
    max: 199,
    fit: 'clamp',
    block: (text) => ({
      type: 'video',
      title: plain('t'),
      video_url: 'https://a.test/v',
      thumbnail_url: 'https://a.test/t.png',
      alt_text: 'v',
      [field]: plain(text),
    }),
    where: `blocks[0] (video) ${field}`,
  })),
  {
    name: 'video author_name',
    max: 49,
    fit: 'clamp',
    block: (author_name) => ({
      type: 'video',
      title: plain('t'),
      video_url: 'https://a.test/v',
      thumbnail_url: 'https://a.test/t.png',
      alt_text: 'v',
      author_name,
    }),
    where: 'blocks[0] (video) author_name',
  },
  // https://docs.slack.dev/reference/block-kit/blocks/container-block
  ...(['title', 'subtitle'] as const).map((field): CharCase => ({
    name: `container ${field}`,
    max: 150,
    fit: 'clamp',
    block: (text) => ({
      type: 'container',
      title: plain('t'),
      [field]: plain(text),
      child_blocks: [{ type: 'divider' }],
    }),
    where: `blocks[0] (container) ${field}`,
  })),
  {
    name: 'container icon alt_text',
    max: 2000,
    fit: 'clamp',
    block: (alt) => ({
      type: 'container',
      title: plain('t'),
      icon: { type: 'image', image_url: 'https://a.test/i.png', alt_text: alt },
      child_blocks: [{ type: 'divider' }],
    }),
    where: 'blocks[0] (container) icon alt_text',
  },
  // https://docs.slack.dev/reference/block-kit/block-elements/button-element
  {
    name: 'button text',
    max: 75,
    fit: 'clamp',
    block: (text) => actions({ type: 'button', text: plain(text) }),
    where: 'blocks[0] (actions) elements[0] text',
  },
  {
    name: 'button value',
    max: 2000,
    fit: 'cut',
    block: (value) => actions({ type: 'button', text: plain('b'), value }),
    where: 'blocks[0] (actions) elements[0] value',
  },
  {
    name: 'button action_id',
    max: 255,
    fit: 'cut',
    block: (action_id) =>
      actions({ type: 'button', text: plain('b'), action_id }),
    where: 'blocks[0] (actions) elements[0] action_id',
  },
  {
    name: 'button url',
    max: 3000,
    fit: 'drop',
    block: (url) => actions({ type: 'button', text: plain('b'), url }),
    where: 'blocks[0] (actions) elements[0] url',
    url: true,
  },
  // https://docs.slack.dev/reference/block-kit/composition-objects/option-object
  ...(
    [
      ['text', 75, 'clamp'],
      ['description', 75, 'clamp'],
      ['value', 150, 'cut'],
      ['url', 3000, 'drop'],
    ] as const
  ).map(([field, max, fit]): CharCase => ({
    name: `option ${field}`,
    max,
    fit,
    block: (value) =>
      actions({
        type: 'overflow',
        action_id: 'a',
        options: [
          option({
            [field]:
              field === 'text' || field === 'description'
                ? plain(value)
                : value,
          }),
        ],
      }),
    where: `blocks[0] (actions) elements[0] options[0] ${field}`,
    url: field === 'url',
  })),
  // https://docs.slack.dev/reference/block-kit/block-elements/select-menu-element
  {
    name: 'select placeholder',
    max: 150,
    fit: 'clamp',
    block: (text) =>
      actions({
        type: 'static_select',
        action_id: 'a',
        placeholder: plain(text),
        options: [option()],
      }),
    where: 'blocks[0] (actions) elements[0] placeholder',
  },
  // https://docs.slack.dev/reference/block-kit/composition-objects/option-group-object
  {
    name: 'option group label',
    max: 75,
    fit: 'clamp',
    block: (text) =>
      actions({
        type: 'static_select',
        action_id: 'a',
        option_groups: [{ label: plain(text), options: [option()] }],
      }),
    where: 'blocks[0] (actions) elements[0] option_groups[0] label',
  },
];

describe('Slack field character limits', () => {
  describe.each(charCases)('$name', ({ max, fit, block, where, url }) => {
    const value = (length: number): string =>
      url ? urlOf(length) : 'x'.repeat(length);

    it('passes the checker at the limit', () => {
      expect(
        slackLimitProblems({ text: 't', blocks: [block(value(max))] })
      ).toEqual([]);
    });

    it('fails the checker one past it', () => {
      expect(
        slackLimitProblems({ text: 't', blocks: [block(value(max + 1))] })
      ).toEqual([`${where} has ${max + 1} characters; Slack allows ${max}.`]);
    });

    it(`is fitted one past it (${fit})`, () => {
      const payload = fitted(block(value(max + 1)));
      expect(payload).not.toContain(value(max + 1));
      switch (fit) {
        case 'clamp':
          expect(payload).toContain(`${value(max - 1)}…`);
          break;
        case 'cut':
          expect(payload).toContain(`"${value(max)}"`);
          break;
        case 'drop':
          expect(payload).not.toContain(URL_HEAD);
          break;
        case 'degrade':
          expect(payload).not.toContain(URL_HEAD);
          expect(payload).toContain('"alt"');
          break;
      }
    });
  });
});

interface CountCase {
  name: string;
  max: number;
  block: (count: number) => SlackBlock;
  where: string;
  /** The largest count of the list anywhere in the fitted payload. */
  largest: (blocks: readonly SlackBlock[]) => number;
}

const options = (count: number): SlackOptionObject[] =>
  Array.from({ length: count }, (_, index) => option({ value: `v${index}` }));

const menuOptions = (blocks: readonly SlackBlock[]): number =>
  Math.max(
    ...blocks.flatMap((block) =>
      block.type === 'actions'
        ? block.elements.flatMap((element) =>
            'options' in element && element.options
              ? [element.options.length]
              : []
          )
        : []
    )
  );

const countCases: CountCase[] = [
  // https://docs.slack.dev/reference/block-kit/blocks/section-block
  {
    name: 'section fields',
    max: 10,
    block: (count) => ({
      type: 'section',
      fields: Array.from({ length: count }, () => ({
        type: 'mrkdwn' as const,
        text: 'f',
      })),
    }),
    where: 'blocks[0] (section) fields',
    largest: (blocks) =>
      Math.max(
        ...blocks.map((block) =>
          block.type === 'section' ? (block.fields?.length ?? 0) : 0
        )
      ),
  },
  // https://docs.slack.dev/reference/block-kit/blocks/context-block
  {
    name: 'context elements',
    max: 10,
    block: (count) => ({
      type: 'context',
      elements: Array.from({ length: count }, () => ({
        type: 'mrkdwn' as const,
        text: 'c',
      })),
    }),
    where: 'blocks[0] (context) elements',
    largest: (blocks) =>
      Math.max(
        ...blocks.map((block) =>
          block.type === 'context' ? block.elements.length : 0
        )
      ),
  },
  // https://docs.slack.dev/reference/block-kit/blocks/actions-block
  {
    name: 'actions elements',
    max: 25,
    block: (count) => ({
      type: 'actions',
      elements: Array.from({ length: count }, () => ({
        type: 'button' as const,
        text: plain('b'),
      })),
    }),
    where: 'blocks[0] (actions) elements',
    largest: (blocks) =>
      Math.max(
        ...blocks.map((block) =>
          block.type === 'actions' ? block.elements.length : 0
        )
      ),
  },
  // https://docs.slack.dev/reference/block-kit/block-elements/overflow-menu-element
  {
    name: 'overflow options',
    max: 5,
    block: (count) =>
      actions({ type: 'overflow', action_id: 'a', options: options(count) }),
    where: 'blocks[0] (actions) elements[0] options',
    largest: menuOptions,
  },
  // https://docs.slack.dev/reference/block-kit/block-elements/radio-button-group-element
  {
    name: 'radio button options',
    max: 10,
    block: (count) =>
      actions({
        type: 'radio_buttons',
        action_id: 'a',
        options: options(count),
      }),
    where: 'blocks[0] (actions) elements[0] options',
    largest: menuOptions,
  },
  // https://docs.slack.dev/reference/block-kit/block-elements/checkboxes-element
  {
    name: 'checkbox options',
    max: 10,
    block: (count) =>
      actions({ type: 'checkboxes', action_id: 'a', options: options(count) }),
    where: 'blocks[0] (actions) elements[0] options',
    largest: menuOptions,
  },
  // https://docs.slack.dev/reference/block-kit/block-elements/select-menu-element
  {
    name: 'select options',
    max: 100,
    block: (count) =>
      actions({
        type: 'static_select',
        action_id: 'a',
        options: options(count),
      }),
    where: 'blocks[0] (actions) elements[0] options',
    largest: menuOptions,
  },
  {
    name: 'select option groups',
    max: 100,
    block: (count) =>
      actions({
        type: 'static_select',
        action_id: 'a',
        option_groups: Array.from({ length: count }, (_, index) => ({
          label: plain('g'),
          options: [option({ value: `v${index}` })],
        })),
      }),
    where: 'blocks[0] (actions) elements[0] option_groups',
    largest: (blocks) =>
      Math.max(
        ...blocks.flatMap((block) =>
          block.type === 'actions'
            ? block.elements.map((element) =>
                element.type === 'static_select'
                  ? (element.option_groups?.length ?? 0)
                  : 0
              )
            : []
        )
      ),
  },
  // https://docs.slack.dev/reference/block-kit/composition-objects/option-group-object
  {
    name: 'option group options',
    max: 100,
    block: (count) =>
      actions({
        type: 'static_select',
        action_id: 'a',
        option_groups: [{ label: plain('g'), options: options(count) }],
      }),
    where: 'blocks[0] (actions) elements[0] option_groups[0] options',
    largest: (blocks) =>
      Math.max(
        ...blocks.flatMap((block) =>
          block.type === 'actions'
            ? block.elements.flatMap((element) =>
                element.type === 'static_select'
                  ? (element.option_groups ?? []).map(
                      (group) => group.options.length
                    )
                  : []
              )
            : []
        )
      ),
  },
  // https://docs.slack.dev/reference/block-kit/blocks/container-block
  {
    name: 'container child blocks',
    max: 10,
    block: (count) => ({
      type: 'container',
      title: plain('t'),
      child_blocks: Array.from({ length: count }, () => ({
        type: 'divider' as const,
      })),
    }),
    where: 'blocks[0] (container) child_blocks',
    largest: (blocks) =>
      Math.max(
        0,
        ...blocks.map((block) =>
          block.type === 'container' ? block.child_blocks.length : 0
        )
      ),
  },
  // https://docs.slack.dev/reference/block-kit/blocks/table-block
  {
    name: 'table rows',
    max: 100,
    block: (count) => ({
      type: 'table',
      rows: Array.from({ length: count }, () => [
        { type: 'raw_text' as const, text: 'c' },
      ]),
    }),
    where: 'blocks[0] (table) rows',
    largest: (blocks) =>
      Math.max(
        0,
        ...blocks.map((block) =>
          block.type === 'table' ? block.rows.length : 0
        )
      ),
  },
];

describe('Slack field count limits', () => {
  describe.each(countCases)('$name', ({ max, block, where, largest }) => {
    it('passes the checker at the limit', () => {
      expect(slackLimitProblems({ text: 't', blocks: [block(max)] })).toEqual(
        []
      );
    });

    it('fails the checker one past it', () => {
      expect(
        slackLimitProblems({ text: 't', blocks: [block(max + 1)] })
      ).toEqual([`${where} has ${max + 1}; Slack allows ${max}.`]);
    });

    it('is fitted one past it', () => {
      const blocks = JSON.parse(fitted(block(max + 1))) as SlackBlock[];
      expect(largest(blocks)).toBeLessThanOrEqual(max);
    });
  });
});

describe('SLACK_FIELD_LIMITS', () => {
  it('covers every limit but the message-wide and structural ones', () => {
    const kinds: ReadonlyArray<{
      chars?: Readonly<Record<string, { limit: string }>>;
      counts?: Readonly<Record<string, string>>;
    }> = Object.values(SLACK_FIELD_LIMITS);
    const named = new Set(
      kinds.flatMap(({ chars = {}, counts = {} }) => [
        ...Object.values(chars).map(({ limit }) => limit),
        ...Object.values(counts),
      ])
    );
    const rest = [
      'blocksPerMessage',
      'fallbackTextChars',
      'tableCellCharsPerMessage',
      'tableColumns',
      'richTextListMaxIndent',
    ];
    expect([...named, ...rest].sort()).toEqual(
      Object.keys(SLACK_LIMITS).sort()
    );
  });
});
