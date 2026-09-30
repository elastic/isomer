/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import type { SlideRenderContext } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { roadmap, roadmapFit } from '../../theme/components/roadmap';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import { rowLoad, sizeForLines, sizeForWidthLoad, smallerStep } from '../size';

import type { SlideRoadmapNode } from './schema';

export const roadmapLoad = ({ columns }: SlideRoadmapNode): number =>
  rowLoad(
    columns.map(({ title, status, items }) => [
      title,
      status,
      ...items.flatMap((item) => [item.title, item.body].map(stripMarks)),
    ])
  );

const gutters = ({ columns }: SlideRoadmapNode): number =>
  (2 * scalePx(roadmap.columnPadding) + scalePx(roadmap.rule)) *
  (columns.length - 1);

/** The largest step at which no word of a horizon title, item title, or item body is wider than its column. */
export const roadmapWordStep = (
  node: SlideRoadmapNode,
  width: number
): SlideSize => {
  const column = Math.max(0, width - gutters(node)) / node.columns.length;
  const fits = (
    text: string,
    tracking: ScaleToken,
    sizes: Readonly<Record<SlideSize, ScaleToken>>
  ) => sizeForLines(undefined, text, tracking, column, sizes, Infinity);
  return node.columns.reduce<SlideSize>(
    (step, { title, items }) =>
      [
        fits(title, roadmap.title.tracking, roadmap.titleSizes),
        ...items.flatMap((item) => [
          fits(
            stripMarks(item.title),
            roadmap.itemTitle.tracking,
            roadmap.itemTitleSizes
          ),
          fits(
            stripMarks(item.body),
            roadmap.itemBody.tracking,
            roadmap.itemBodySizes
          ),
        ]),
      ].reduce(smallerStep, step),
    'l'
  );
};

export const roadmapStep = (
  node: SlideRoadmapNode,
  context: SlideRenderContext | undefined
): SlideSize => {
  const layout = slideLayout(context);
  return (
    node.size ??
    smallerStep(
      sizeForWidthLoad(
        undefined,
        roadmapLoad(node),
        roadmapFit,
        layout,
        gutters(node)
      ),
      roadmapWordStep(node, layout.width)
    )
  );
};
