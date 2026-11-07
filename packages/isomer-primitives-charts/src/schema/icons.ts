/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';

import { CHART_GLYPHS, type ChartGlyph } from '../glyphs';

/** A glyph by name. */
export const glyphSchema = z
  .enum(Object.keys(CHART_GLYPHS) as [ChartGlyph, ...ChartGlyph[]])
  .describe(
    `A glyph: ${Object.entries(CHART_GLYPHS)
      .map(([name, { shows }]) => `\`${name}\` (${shows})`)
      .join(', ')}.`
  );
