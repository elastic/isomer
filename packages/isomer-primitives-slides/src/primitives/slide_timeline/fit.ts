/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripMarks } from '../../render/marks';
import { font } from '../../theme/base';
import { frameContentWidth } from '../../theme/components/frame';
import { timeline } from '../../theme/components/timeline';
import { scalePx } from '../../theme/scale';
import { countKeys, type SlideSize } from '../../theme/variants';
import { lineFill, wrappedLines } from '../size';

/** Heading heights the row can match; a taller heading runs past the others. */
export const timelineHeadingLines = countKeys(1, 6);

/** So bodies start level: the tallest heading's estimated lines. */
export const timelineHeadingLineCount = (
  headings: readonly string[],
  step: SlideSize
): number => {
  const width =
    (frameContentWidth - scalePx(timeline.gap) * (headings.length - 1)) /
    headings.length;
  const lines = Math.max(
    ...headings.map((heading) =>
      wrappedLines(
        `${timeline.quoteOpen.value}${stripMarks(heading)}${timeline.quoteClose.value}`,
        scalePx(timeline.headingSizes[step]),
        width * lineFill,
        font.tracking.none
      )
    )
  );
  return Math.min(lines, timelineHeadingLines.length);
};
