/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke } from '../base';
import { literal, paddingXy } from '../scale';

/** Inline `code` and `**strong**` marks inside authored text. */
export const marks = {
  // The chip keeps its run's font size: a smaller em would drop body copy under 24px.
  code: { family: font.family.mono },
  codeBorder: stroke.panel,
  codeRadius: radius.chipSmall,
  // No vertical padding, so a chip stays inside its line box; little side padding, so punctuation after it stays close.
  codePadding: paddingXy(literal('0'), space.px6),
  // In bold or display-size text a chip outweighs its words, so code is mono alone.
  displayCode: { family: font.family.mono, weight: font.weight.medium },
  strong: { weight: font.weight.bold },
} as const;
