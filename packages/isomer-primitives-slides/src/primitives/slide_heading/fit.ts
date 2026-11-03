/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripMarks } from '../../render/marks';
import {
  frame,
  frameBodyHeight,
  frameContentWidth,
} from '../../theme/components/frame';
import { heading, headingFit } from '../../theme/components/heading';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { lineBox, measureText, sizeForLoad, textColumns } from '../size';

import type { SlideHeadingNode } from './schema';

/** Height of a heading of `titleLines` and `ledeLines` at `step`. */
export const headingLinesHeight = (
  titleLines: number,
  ledeLines: number,
  step: SlideSize
): number =>
  titleLines * lineBox({ ...heading.title, size: heading.titleSizes[step] }) +
  (ledeLines > 0
    ? scalePx(heading.ledeGap) + ledeLines * lineBox(heading.lede)
    : 0);

export const headingStep = ({ title, size }: SlideHeadingNode): SlideSize =>
  sizeForLoad(size, textColumns(stripMarks(title)), headingFit);

/** Height `node` takes in a column `width` wide. */
export const headingHeight = (
  node: SlideHeadingNode,
  width: number
): number => {
  const step = headingStep(node);
  const titleLines = measureText(
    stripMarks(node.title),
    { ...heading.title, size: heading.titleSizes[step] },
    Math.min(width, scalePx(heading.titleMaxWidth))
  ).lines;
  const ledeLines = node.lede
    ? measureText(
        stripMarks(node.lede),
        heading.lede,
        Math.min(width, scalePx(heading.ledeMaxWidth))
      ).lines
    : 0;
  return headingLinesHeight(Math.max(1, titleLines), ledeLines, step);
};

/** Height a frame's body has left below `node`. */
export const headingRoom = (node: SlideHeadingNode): number =>
  frameBodyHeight -
  headingHeight(node, frameContentWidth) -
  scalePx(frame.bodyGap);
