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
});
