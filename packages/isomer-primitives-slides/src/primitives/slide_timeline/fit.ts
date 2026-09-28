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
import type { SlideSize } from '../../theme/variants';
import { wrappedLines } from '../size';

const { tracking } = font;

/** The height every heading in a row takes, so bodies start level: the tallest heading's estimated lines. */
export const timelineHeadingHeight = (
  headings: readonly string[],
  step: SlideSize
): number => {
  const fontPx = scalePx(timeline.headingSizes[step]);
  const width =
    (frameContentWidth - scalePx(timeline.gap) * (headings.length - 1)) /
    headings.length;
  const lines = Math.max(
    ...headings.map((heading) =>
      wrappedLines(
        `${timeline.quoteOpen.value}${stripMarks(heading)}${timeline.quoteClose.value}`,
        fontPx,
        width,
        tracking.none
      )
    )
  );
  return lines * fontPx * parseFloat(timeline.heading.lineHeight.value);
};
