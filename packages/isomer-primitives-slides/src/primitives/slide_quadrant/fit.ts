/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { quadrantFit } from '../../theme/components/quadrant';
import type { SlideSize } from '../../theme/variants';
import type { StepLayout } from '../layout';
import { sizeForWidthLoad } from '../size';

import type { SlideQuadrantNode } from './schema';

/** By the fullest top cell's items plus the fullest bottom cell's, scaled by how much narrower than a frame body its layout is. */
export const quadrantStep = (
  { quadrants, size }: Pick<SlideQuadrantNode, 'quadrants' | 'size'>,
  layout: Pick<StepLayout, 'width' | 'crowding'>
): SlideSize => {
  const [tl, tr, bl, br] = quadrants.map(({ items = [] }) => items.length);
  return sizeForWidthLoad(
    size,
    Math.max(tl ?? 0, tr ?? 0) + Math.max(bl ?? 0, br ?? 0),
    quadrantFit,
    layout
  );
};
