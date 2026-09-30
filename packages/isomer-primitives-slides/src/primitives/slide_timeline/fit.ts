/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideRenderContext } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { font } from '../../theme/base';
import { timeline, timelineFit } from '../../theme/components/timeline';
import { scalePx } from '../../theme/scale';
import { countKeys, type SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import {
  lineFill,
  rowLoad,
  sizeForLines,
  sizeForWidthLoad,
  smallerStep,
  trackWidth,
  wrappedLines,
} from '../size';

import type { SlideTimelineNode } from './schema';

export const timelineLoad = ({ items }: SlideTimelineNode): number =>
  rowLoad(
    items.map(({ label, channel, heading, body }) => [
      label,
      channel,
      stripMarks(heading),
      stripMarks(body),
    ])
  );

/** The largest step at which no word of a label, heading, or body is wider than its column. */
export const timelineWordStep = (
  { items }: SlideTimelineNode,
  width: number
): SlideSize => {
  const column = trackWidth(
    width,
    items.map(() => 1),
    timeline.gap
  );
  return items.reduce<SlideSize>(
    (step, { label, heading, body }) =>
      [
        sizeForLines(
          undefined,
          label,
          timeline.label.tracking,
          column,
          timeline.labelSizes,
          Infinity
        ),
        sizeForLines(
          undefined,
          `${timeline.quoteOpen.value}${stripMarks(heading)}${timeline.quoteClose.value}`,
          font.tracking.none,
          column,
          timeline.headingSizes,
          Infinity
        ),
        sizeForLines(
          undefined,
          stripMarks(body),
          timeline.body.tracking,
          column,
          timeline.bodySizes,
          Infinity
        ),
      ].reduce(smallerStep, step),
    'l'
  );
};

export const timelineStep = (
  node: SlideTimelineNode,
  context: SlideRenderContext | undefined
): SlideSize => {
  const layout = slideLayout(context);
  return (
    node.size ??
    smallerStep(
      sizeForWidthLoad(
        undefined,
        timelineLoad(node),
        timelineFit,
        layout,
        scalePx(timeline.gap) * (node.items.length - 1)
      ),
      timelineWordStep(node, layout.width)
    )
  );
};

/** Heading heights the row can match; a taller heading runs past the others. */
export const timelineHeadingLines = countKeys(1, 6);

/** So bodies start level: the tallest heading's estimated lines. */
export const timelineHeadingLineCount = (
  headings: readonly string[],
  step: SlideSize,
  context?: SlideRenderContext
): number => {
  const width = trackWidth(
    slideLayout(context).width,
    headings.map(() => 1),
    timeline.gap
  );
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
