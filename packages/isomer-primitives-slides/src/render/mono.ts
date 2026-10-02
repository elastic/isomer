/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A per-character estimate: East Asian wide glyphs and emoji take two columns, marks and controls none.

const WIDE =
  /[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6\u{20000}-\u{3FFFD}]|\p{Emoji_Presentation}/u;

const ZERO = /[\p{M}\p{Cc}\p{Cf}]/u;

export const isWide = (glyph: string): boolean => WIDE.test(glyph);

/** Columns `text` fills. Counting stops once past `limit`. */
export const displayColumns = (text: string, limit = Infinity): number => {
  let columns = 0;
  for (const glyph of text) {
    columns += ZERO.test(glyph) ? 0 : isWide(glyph) ? 2 : 1;
    if (columns > limit) {
      return columns;
    }
  }
  return columns;
};
