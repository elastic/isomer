/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SlackActionElement,
  SlackBlock,
  SlackOptionObject,
} from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';

import { slackLimitProblems } from './slack_limits';

const plain = (text: string) => ({ type: 'plain_text' as const, text });
const mrkdwn = (text: string) => ({ type: 'mrkdwn' as const, text });

describe('slackLimitProblems', () => {
  it('accepts a message within every limit', () => {
    const blocks: SlackBlock[] = [
      { type: 'header', text: plain('Summary') },
      { type: 'section', text: mrkdwn('All good.'), fields: [mrkdwn('a')] },
      { type: 'context', elements: [mrkdwn('note')] },
    ];
    expect(slackLimitProblems({ text: 'Summary', blocks })).toEqual([]);
  });

  it('names each block and limit it breaks', () => {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: plain('h'.repeat(SLACK_LIMITS.headerTextChars + 1)),
      },
      {
        type: 'section',
        text: mrkdwn('s'.repeat(SLACK_LIMITS.sectionTextChars + 1)),
        fields: Array.from({ length: SLACK_LIMITS.fieldsPerSection + 1 }, () =>
          mrkdwn('f')
        ),
      },
      {
        type: 'context',
        elements: Array.from({ length: SLACK_LIMITS.contextElements + 1 }, () =>
          mrkdwn('c')
        ),
      },
    ];
    expect(slackLimitProblems({ text: 'Summary', blocks })).toEqual([
      'blocks[0] (header) text has 151 characters; Slack allows 150.',
      'blocks[1] (section) text has 3001 characters; Slack allows 3000.',
      'blocks[1] (section) fields has 11; Slack allows 10.',
      'blocks[2] (context) elements has 11; Slack allows 10.',
    ]);
  });

  it('counts blocks and fallback text across the message', () => {
    const blocks: SlackBlock[] = Array.from(
      { length: SLACK_LIMITS.blocksPerMessage + 1 },
      () => ({ type: 'divider' })
    );
    expect(
      slackLimitProblems({
        text: 't'.repeat(SLACK_LIMITS.fallbackTextChars + 1),
        blocks,
      })
    ).toEqual([
      'The message blocks has 51; Slack allows 50.',
      'The fallback text has 4001 characters; Slack allows 4000.',
    ]);
  });

  it('counts table cell text across every table in the message', () => {
    const half = Math.ceil(SLACK_LIMITS.tableCellCharsPerMessage / 2);
    const table = (text: string): SlackBlock => ({
      type: 'table',
      rows: [
        [
          { type: 'raw_text', text },
          {
            type: 'rich_text',
            elements: [
              {
                type: 'rich_text_section',
                elements: [{ type: 'link', url: 'https://x.co' }],
              },
            ],
          },
        ],
      ],
    });
    expect(
      slackLimitProblems({
        text: 'T',
        blocks: [table('a'.repeat(half)), table('b'.repeat(half))],
      })
    ).toEqual([
      `The message's table cells have ${2 * (half + 'https://x.co'.length)} characters; Slack allows ${SLACK_LIMITS.tableCellCharsPerMessage}.`,
    ]);
  });

  const over = (limit: number) => 'x'.repeat(limit + 1);
  const option = (
    fields: Partial<SlackOptionObject> = {}
  ): SlackOptionObject => ({
    text: plain('o'),
    value: 'v',
    ...fields,
  });
  const options = (count: number) =>
    Array.from({ length: count }, () => option());
  const actions = (element: SlackActionElement): SlackBlock => ({
    type: 'actions',
    elements: [element],
  });
  const button = (
    fields: Partial<Extract<SlackActionElement, { type: 'button' }>> = {}
  ) => actions({ type: 'button', text: plain('Go'), ...fields });
  const select = (
    fields: Partial<Extract<SlackActionElement, { type: 'static_select' }>>
  ) => actions({ type: 'static_select', action_id: 'a', ...fields });

  // One message per limit, each breaking only that limit.
  const breaking = {
    blocksPerMessage: Array.from(
      { length: SLACK_LIMITS.blocksPerMessage + 1 },
      (): SlackBlock => ({ type: 'divider' })
    ),
    sectionTextChars: [
      { type: 'section', text: mrkdwn(over(SLACK_LIMITS.sectionTextChars)) },
    ],
    sectionFieldChars: [
      {
        type: 'section',
        fields: [mrkdwn(over(SLACK_LIMITS.sectionFieldChars))],
      },
    ],
    contextElementChars: [
      {
        type: 'context',
        elements: [mrkdwn(over(SLACK_LIMITS.contextElementChars))],
      },
    ],
    headerTextChars: [
      { type: 'header', text: plain(over(SLACK_LIMITS.headerTextChars)) },
    ],
    fieldsPerSection: [
      {
        type: 'section',
        fields: Array.from({ length: SLACK_LIMITS.fieldsPerSection + 1 }, () =>
          mrkdwn('f')
        ),
      },
    ],
    contextElements: [
      {
        type: 'context',
        elements: Array.from({ length: SLACK_LIMITS.contextElements + 1 }, () =>
          mrkdwn('c')
        ),
      },
    ],
    buttonsPerActions: [
      {
        type: 'actions',
        elements: Array.from(
          { length: SLACK_LIMITS.buttonsPerActions + 1 },
          (): SlackActionElement => ({ type: 'button', text: plain('Go') })
        ),
      },
    ],
    fallbackTextChars: [],
    optionTextChars: [
      select({
        options: [option({ text: plain(over(SLACK_LIMITS.optionTextChars)) })],
      }),
    ],
    optionsPerSelect: [
      select({ options: options(SLACK_LIMITS.optionsPerSelect + 1) }),
    ],
    optionsPerOverflow: [
      actions({
        type: 'overflow',
        action_id: 'a',
        options: options(SLACK_LIMITS.optionsPerOverflow + 1),
      }),
    ],
    optionsPerChoice: [
      {
        type: 'section',
        text: mrkdwn('Pick'),
        accessory: {
          type: 'radio_buttons',
          action_id: 'a',
          options: options(SLACK_LIMITS.optionsPerChoice + 1),
        },
      },
    ],
    optionGroupsPerSelect: [
      select({
        option_groups: Array.from(
          { length: SLACK_LIMITS.optionGroupsPerSelect + 1 },
          () => ({ label: plain('g'), options: [option()] })
        ),
      }),
    ],
    optionValueChars: [
      actions({
        type: 'checkboxes',
        action_id: 'a',
        options: [option({ value: over(SLACK_LIMITS.optionValueChars) })],
      }),
    ],
    buttonValueChars: [button({ value: over(SLACK_LIMITS.buttonValueChars) })],
    urlChars: [button({ url: over(SLACK_LIMITS.urlChars) })],
    actionIdChars: [button({ action_id: over(SLACK_LIMITS.actionIdChars) })],
    richTextListMaxIndent: [
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_list',
            style: 'bullet',
            indent: SLACK_LIMITS.richTextListMaxIndent + 1,
            elements: [],
          },
        ],
      },
    ],
    tableCellCharsPerMessage: [
      {
        type: 'table',
        rows: [
          [
            {
              type: 'raw_text',
              text: over(SLACK_LIMITS.tableCellCharsPerMessage),
            },
          ],
        ],
      },
    ],
    tableRows: [
      {
        type: 'table',
        rows: Array.from({ length: SLACK_LIMITS.tableRows + 1 }, () => [
          { type: 'raw_text' as const, text: 'c' },
        ]),
      },
    ],
    tableColumns: [
      {
        type: 'table',
        rows: [
          Array.from({ length: SLACK_LIMITS.tableColumns + 1 }, () => ({
            type: 'raw_text' as const,
            text: 'c',
          })),
        ],
      },
    ],
    imageUrlChars: [
      {
        type: 'context',
        elements: [
          {
            type: 'image',
            image_url: over(SLACK_LIMITS.imageUrlChars),
            alt_text: 'a',
          },
        ],
      },
    ],
    imageAltTextChars: [
      {
        type: 'section',
        text: mrkdwn('s'),
        accessory: {
          type: 'image',
          image_url: 'https://x.co/i.png',
          alt_text: over(SLACK_LIMITS.imageAltTextChars),
        },
      },
    ],
    imageTitleChars: [
      {
        type: 'image',
        image_url: 'https://x.co/i.png',
        alt_text: 'a',
        title: plain(over(SLACK_LIMITS.imageTitleChars)),
      },
    ],
    videoTitleChars: [
      {
        type: 'video',
        title: plain(over(SLACK_LIMITS.videoTitleChars)),
        video_url: 'https://x.co/v',
        thumbnail_url: 'https://x.co/t.png',
        alt_text: 'a',
      },
    ],
    videoDescriptionChars: [
      {
        type: 'video',
        title: plain('t'),
        description: plain(over(SLACK_LIMITS.videoDescriptionChars)),
        video_url: 'https://x.co/v',
        thumbnail_url: 'https://x.co/t.png',
        alt_text: 'a',
      },
    ],
    videoAuthorNameChars: [
      {
        type: 'video',
        title: plain('t'),
        author_name: over(SLACK_LIMITS.videoAuthorNameChars),
        video_url: 'https://x.co/v',
        thumbnail_url: 'https://x.co/t.png',
        alt_text: 'a',
      },
    ],
    buttonTextChars: [
      button({ text: plain(over(SLACK_LIMITS.buttonTextChars)) }),
    ],
    placeholderChars: [
      select({ placeholder: plain(over(SLACK_LIMITS.placeholderChars)) }),
    ],
    optionGroupLabelChars: [
      select({
        option_groups: [
          {
            label: plain(over(SLACK_LIMITS.optionGroupLabelChars)),
            options: [option()],
          },
        ],
      }),
    ],
  } satisfies Record<keyof typeof SLACK_LIMITS, SlackBlock[]>;

  it.each(Object.entries(breaking).filter(([, blocks]) => blocks.length > 0))(
    'reports a message past %s',
    (limit, blocks) => {
      const max = SLACK_LIMITS[limit as keyof typeof SLACK_LIMITS];
      const problems = slackLimitProblems({ text: 'T', blocks });

      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain(`Slack allows ${max}.`);
    }
  );

  it('reports a table with an empty row', () => {
    expect(
      slackLimitProblems({ text: 'T', blocks: [{ type: 'table', rows: [[]] }] })
    ).toEqual([
      'blocks[0] (table) rows[0] cells is empty; Slack requires at least 1.',
    ]);
  });

  it('names the nested element that breaks a limit', () => {
    expect(
      slackLimitProblems({
        text: 'T',
        blocks: [button({ text: plain(over(SLACK_LIMITS.buttonTextChars)) })],
      })
    ).toEqual([
      `blocks[0] (actions) elements[0] text has ${SLACK_LIMITS.buttonTextChars + 1} characters; Slack allows ${SLACK_LIMITS.buttonTextChars}.`,
    ]);
  });
});
