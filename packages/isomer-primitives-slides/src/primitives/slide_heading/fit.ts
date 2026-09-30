/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripMarks } from '../../render/marks';
import { frame, frameBodyHeight } from '../../theme/components/frame';
import { heading, headingFit } from '../../theme/components/heading';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { measureText, sizeForLoad, textColumns } from '../size';

import type { SlideHeadingNode } from './schema';

const px = scalePx;
const leading = (token: { value: string }) => parseFloat(token.value);

const headingHeight = (
  titleLines: number,
  ledeLines: number,
  step: SlideSize
): number =>
  titleLines *
    px(heading.titleSizes[step]) *
    leading(heading.title.lineHeight) +
  (ledeLines > 0
    ? px(heading.ledeGap) +
      ledeLines * px(heading.lede.size) * leading(heading.lede.lineHeight)
    : 0);

/** Height left below a heading of `titleLines` and `ledeLines` at `step`. */
const roomBelow = (
  titleLines: number,
  ledeLines: number,
  step: SlideSize
): number =>
  frameBodyHeight -
  headingHeight(titleLines, ledeLines, step) -
  px(frame.bodyGap);

/** Room below a two-line title and lede at `l`; load budgets are set against it. */
export const referenceRoom = roomBelow(2, 2, 'l');

export const headingStep = ({ title, size }: SlideHeadingNode): SlideSize =>
  sizeForLoad(size, textColumns(stripMarks(title)), headingFit);

/** Height a frame's body has left below `node`. */
export const headingRoom = (node: SlideHeadingNode): number => {
  const step = headingStep(node);
  const titleLines = measureText(
    stripMarks(node.title),
    { ...heading.title, size: heading.titleSizes[step] },
    px(heading.titleMaxWidth)
  ).lines;
  const ledeLines = node.lede
    ? measureText(stripMarks(node.lede), heading.lede, px(heading.ledeMaxWidth))
        .lines
    : 0;
  return roomBelow(Math.max(1, titleLines), ledeLines, step);
};
