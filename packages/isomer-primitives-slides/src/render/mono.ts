/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// East Asian wide and fullwidth ranges, whose glyphs fall back to a font about two mono advances wide.
/** Whether a code point is East Asian wide or fullwidth. */
export const WIDE =
  /[\u1100-\u115f\u2e80-\u303e\u3041-\u33ff\u3400-\u4dbf\u4e00-\u9fff\ua000-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6\u{20000}-\u{3fffd}]/u;

// An emoji-presentation character, a keycap, or an emoji selector draws its cluster as an emoji.
const EMOJI = /\p{Emoji_Presentation}|\u20e3|\ufe0f/u;

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * The columns `text` fills, per grapheme cluster: a wide glyph or an emoji
 * takes two, a lone combining mark none, anything else one. Monospace takes it
 * as a width, and a proportional estimate as characters, a wide glyph being
 * about two Latin ones. Counting stops once it passes `limit`.
 */
export const displayColumns = (text: string, limit = Infinity): number => {
  let columns = 0;
  for (const { segment } of graphemes.segment(text)) {
    columns +=
      EMOJI.test(segment) || WIDE.test(segment)
        ? 2
        : /^\p{M}+$/u.test(segment)
          ? 0
          : 1;
    // Past `limit` the exact width no longer matters, so a long value costs no more than the limit.
    if (columns > limit) {
      return columns;
    }
  }
  return columns;
};
