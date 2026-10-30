/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  closing as theme,
  closingShares,
} from '../../theme/components/closing';
import type { SlideSize } from '../../theme/variants';
import type { StepLayout } from '../layout';
import { sizeForLines, trackWidth } from '../size';

import type { ClosingSlideNode } from './schema';

/** The node's own `size`, else the largest step at which the title breaks no word and takes two lines at most, in the lead column when paths sit beside it. */
export const closingStep = (
  {
    title,
    paths = [],
    size,
  }: Pick<ClosingSlideNode, 'title' | 'paths' | 'size'>,
  { width }: Pick<StepLayout, 'width'>
): SlideSize =>
  sizeForLines(
    size,
    title,
    theme.title.tracking,
    paths.length > 0
      ? trackWidth(width, closingShares, theme.columnGap)
      : width,
    theme.titleSizes
  );
