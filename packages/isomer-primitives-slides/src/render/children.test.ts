/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { quoteMarkdown, quoteText, slackCaption } from './children';

const terminators = [
  ['\\n', '\n'],
  ['\\r', '\r'],
  ['\\r\\n', '\r\n'],
  ['U+2028', '\u2028'],
  ['U+2029', '\u2029'],
] as const;

describe('quoting an embedded document', () => {
  it.each(terminators)(
    'indents every line after %s in text',
    (_name, terminator) => {
      expect(quoteText(`one${terminator}${terminator}two`)).toBe(
        '  one\n\n  two'
      );
    }
  );

  it.each(terminators)(
    'quotes every line after %s in markdown',
    (_name, terminator) => {
      expect(quoteMarkdown(`one${terminator}${terminator}two`)).toBe(
        '> one\n>\n> two'
      );
    }
  );
});

describe('slackCaption', () => {
  it.each(terminators)(
    'keeps its text on one line across %s',
    (_name, terminator) => {
      expect(slackCaption(`one${terminator}two`, true)).toEqual({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: '*one two*' }],
      });
    }
  );
});
