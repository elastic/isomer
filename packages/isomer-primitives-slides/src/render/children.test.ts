/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { slackCaption } from './children';

describe('slackCaption', () => {
  it.each([
    ['\\n', '\n'],
    ['\\r', '\r'],
    ['\\r\\n', '\r\n'],
    ['U+2028', '\u2028'],
    ['U+2029', '\u2029'],
  ])('keeps its text on one line across %s', (_name, terminator) => {
    expect(slackCaption(`one${terminator}two`, true)).toEqual({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '*one two*' }],
    });
  });

  it.each([' Risks', 'Risks ', 'Risks\n'])(
    'bolds %j with its edge whitespace outside the asterisks',
    (label) => {
      expect(slackCaption(label, true)).toEqual({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: '*Risks*' }],
      });
    }
  );

  it.each(['*', '_', '~', '`'])(
    'sets text holding %s as literal rich text, bold when strong',
    (delimiter) => {
      const text = `order${delimiter}id`;
      expect(slackCaption(text)).toEqual({
        type: 'rich_text',
        elements: [
          { type: 'rich_text_section', elements: [{ type: 'text', text }] },
        ],
      });
      expect(slackCaption(text, true)).toEqual({
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [{ type: 'text', text, style: { bold: true } }],
          },
        ],
      });
    }
  );

  it('keeps text with no delimiter in a context block', () => {
    expect(slackCaption('Order <id> & receipt')).toEqual({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: 'Order &lt;id&gt; &amp; receipt' }],
    });
  });
});
