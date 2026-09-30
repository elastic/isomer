/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideRenderContext } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { label as labelRole } from '../../theme/components/shared';
import { timeline, timelineFit } from '../../theme/components/timeline';
import { scalePx } from '../../theme/scale';
import { countKeys, type SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import {
  lineFill,
  measureMarks,
  rowLoad,
  sizeForMarkedWords,
  sizeForWidthLoad,
  sizeForWords,
  smallerStep,
  styledText,
  trackWidth,
} from '../size';

import type { SlideTimelineNode } from './schema';

const quoted = (heading: string): string =>
  `${timeline.quoteOpen.value}${heading}${timeline.quoteClose.value}`;

const columnWidth = (count: number, width: number): number =>
  trackWidth(
    width,
    Array.from({ length: count }, () => 1),
    timeline.gap
  );

export const timelineLoad = ({ items }: SlideTimelineNode): number =>
  rowLoad(
    items.map(({ label, channel, heading, body }) => [
      label,
      styledText(channel, labelRole),
      stripMarks(heading),
      stripMarks(body),
    ])
  );

/** The largest step at which no label, and no word of a heading or body, is wider than its column. */
export const timelineWordStep = (
  { items }: SlideTimelineNode,
  width: number
): SlideSize => {
  const column = columnWidth(items.length, width);
  return items.reduce<SlideSize>(
    (step, { label, heading, body }) =>
      [
        sizeForWords(label, timeline.label, timeline.labelSizes, column),
        sizeForMarkedWords(
          quoted(heading),
          timeline.heading,
          timeline.headingSizes,
          column,
          'primary'
        ),
        sizeForMarkedWords(body, timeline.body, timeline.bodySizes, column),
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
  const width = columnWidth(headings.length, slideLayout(context).width);
  const lines = Math.max(
    ...headings.map((heading) =>
      Math.max(
        1,
        measureMarks(
          quoted(heading),
          { ...timeline.heading, size: timeline.headingSizes[step] },
          width * lineFill,
          'primary'
        ).lines
      )
    )
  );
  return Math.min(lines, timelineHeadingLines.length);
};
