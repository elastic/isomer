/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { title as theme, titleShares } from '../../theme/components/title';
import type { SlideSize } from '../../theme/variants';
import type { StepLayout } from '../layout';
import { sizeForLines, trackWidth } from '../size';

import type { TitleSlideNode } from './types';

/** Width of column `index` of a title slide with an aside, across `width`. */
export const titleColumn = (width: number, index: 0 | 1): number =>
  trackWidth(width, titleShares, theme.columnGap, index);

/** The node's own `size`, else the largest step at which the title breaks no word and takes two lines at most, in the lead column when an aside sits beside it. */
export const titleStep = (
  { title, aside, size }: Pick<TitleSlideNode, 'title' | 'aside' | 'size'>,
  { width }: Pick<StepLayout, 'width'>
): SlideSize =>
  sizeForLines(
    size,
    title,
    theme.display.tracking,
    aside ? titleColumn(width, 0) : width,
    theme.displaySizes
  );
