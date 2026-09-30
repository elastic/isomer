/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideRenderContext } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { roadmap, roadmapFit } from '../../theme/components/roadmap';
import { label } from '../../theme/components/shared';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import {
  rowLoad,
  sizeForWidthLoad,
  sizeForWords,
  smallerStep,
  styledText,
} from '../size';

import type { SlideRoadmapNode } from './schema';

export const roadmapLoad = ({ columns }: SlideRoadmapNode): number =>
  rowLoad(
    columns.map(({ title, status, items }) => [
      title,
      styledText(status, label),
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
  return node.columns.reduce<SlideSize>(
    (step, { title, items }) =>
      [
        sizeForWords(title, roadmap.title, roadmap.titleSizes, column),
        ...items.flatMap((item) => [
          sizeForWords(
            stripMarks(item.title),
            roadmap.itemTitle,
            roadmap.itemTitleSizes,
            column
          ),
          sizeForWords(
            stripMarks(item.body),
            roadmap.itemBody,
            roadmap.itemBodySizes,
            column
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
