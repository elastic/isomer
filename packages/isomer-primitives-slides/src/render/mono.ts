/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringWidth from 'string-width';

// An escape sequence draws as its glyphs on a slide, and counting it keeps a width the sum of its graphemes'.
const options = { countAnsiEscapeCodes: true };

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * The columns `text` fills: a wide glyph or an emoji takes two, a combining
 * mark or a control none, anything else one. Monospace takes it as a width,
 * and a proportional estimate as characters, a wide glyph being about two
 * Latin ones. Counting stops once it passes `limit`.
 */
export const displayColumns = (text: string, limit = Infinity): number => {
  if (limit === Infinity) {
    return stringWidth(text, options);
  }
  let columns = 0;
  for (const { segment } of graphemes.segment(text)) {
    columns += stringWidth(segment, options);
    // Past `limit` the exact width no longer matters, so a long value costs no more than the limit.
    if (columns > limit) {
      return columns;
    }
  }
  return columns;
};
