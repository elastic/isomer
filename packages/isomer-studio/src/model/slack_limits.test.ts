/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackBlock } from '@elastic/isomer-sdk/slack';
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
});
