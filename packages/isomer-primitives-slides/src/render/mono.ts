/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// East Asian wide and fullwidth ranges, whose glyphs fall back to a font about two mono advances wide.
const WIDE =
  /[\u1100-\u115f\u2e80-\u303e\u3041-\u33ff\u3400-\u4dbf\u4e00-\u9fff\ua000-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6\u{20000}-\u{3fffd}]|\p{Extended_Pictographic}/u;

/** The monospace columns `text` fills: a wide glyph or emoji takes two, a combining mark none. */
export const monoColumns = (text: string): number =>
  [...text].reduce(
    (columns, char) =>
      columns + (/\p{M}/u.test(char) ? 0 : WIDE.test(char) ? 2 : 1),
    0
  );
