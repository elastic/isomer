/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideRenderContext } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { roadmap, roadmapFit } from '../../theme/components/roadmap';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import { rowLoad, sizeForWidthLoad } from '../size';

import type { SlideRoadmapNode } from './schema';

export const roadmapLoad = ({ columns }: SlideRoadmapNode): number =>
  rowLoad(
    columns.map(({ title, status, items }) => [
      title,
      status,
      ...items.flatMap((item) => [item.title, item.body].map(stripMarks)),
    ])
  );

export const roadmapStep = (
  node: SlideRoadmapNode,
  context: SlideRenderContext | undefined
): SlideSize =>
  sizeForWidthLoad(
    node.size,
    roadmapLoad(node),
    roadmapFit,
    slideLayout(context),
    (2 * scalePx(roadmap.columnPadding) + scalePx(roadmap.rule)) *
      (node.columns.length - 1)
  );
