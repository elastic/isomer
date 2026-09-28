/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import { stripMarks } from '../../render/marks';
import { displayColumns } from '../../render/mono';
import { regularAdvance } from '../../theme/base';
import { frame } from '../../theme/components/frame';
import { heading, headingFit } from '../../theme/components/heading';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { emWidth, sizeForLoad } from '../size';

import type { SlideHeadingNode } from './schema';

const px = scalePx;
const leading = (token: { value: string }) => parseFloat(token.value);

/** Height of a heading with `titleLines` lines of title at `step` and `ledeLines` lines of lede. */
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

/** Height of the frame body, inside its padding. */
const bodyHeight =
  px(frame.height) - px(frame.paddingTop) - px(frame.paddingBottom);

/** Room below a heading, before the body gap; at least a pixel, so crowding stays positive and finite. */
const roomBelow = (height: number): number =>
  Math.max(1, bodyHeight - height - px(frame.bodyGap));

/** Room below a two-line title and a two-line lede at `l`, which the load budgets are set against. */
export const referenceRoom = roomBelow(headingHeight(2, 2, 'l'));

/** The title step {@link SlideHeadingNode} draws. */
export const headingStep = ({ title, size }: SlideHeadingNode): SlideSize =>
  sizeForLoad(size, displayColumns(stripMarks(title)), headingFit);

/** How much tighter than the reference the room below `node` is, for {@link SlideRenderContext.crowding}. */
export const headingCrowding = (node: SlideHeadingNode): number => {
  const step = headingStep(node);
  const lines = (width: number, max: ScaleToken) =>
    Math.max(1, Math.ceil(width / px(max)));
  const titleLines = lines(
    emWidth(stripMarks(node.title), heading.title.tracking) *
      px(heading.titleSizes[step]),
    heading.titleMaxWidth
  );
  const ledeLines = node.lede
    ? lines(
        displayColumns(stripMarks(node.lede)) *
          regularAdvance *
          px(heading.lede.size),
        heading.ledeMaxWidth
      )
    : 0;
  return referenceRoom / roomBelow(headingHeight(titleLines, ledeLines, step));
};
