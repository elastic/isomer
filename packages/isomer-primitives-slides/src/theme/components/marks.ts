/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke } from '../base';
import { literal, paddingXy } from '../scale';

export const marks = {
  // The chip keeps its run's font size; a smaller em would drop body copy under 24px.
  code: { family: font.family.mono },
  codeBorder: stroke.panel,
  codeRadius: radius.chipSmall,
  // No vertical padding keeps the chip in its line box; little side padding keeps punctuation close.
  codePadding: paddingXy(literal('0'), space.px6),
  // In bold or display text a chip outweighs its words, so code is mono alone.
  displayCode: { family: font.family.mono, weight: font.weight.medium },
  strong: { weight: font.weight.bold },
  // Weight cannot carry strong in display text, so it is underlined as well as `primary`.
  displayStrong: { rule: stroke.bar, offset: space.px8 },
} as const;
