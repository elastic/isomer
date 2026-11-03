/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  section as theme,
  sectionShares,
} from '../../theme/components/section';
import type { SlideSize } from '../../theme/variants';
import type { StepLayout } from '../layout';
import { sizeForLines, trackWidth } from '../size';

import type { SectionSlideNode } from './schema';

/** The node's own `size`, else the largest step at which the title breaks no word and takes two lines at most in its column. */
export const sectionStep = (
  { title, size }: Pick<SectionSlideNode, 'title' | 'size'>,
  { width }: Pick<StepLayout, 'width'>
): SlideSize =>
  sizeForLines(
    size,
    title,
    theme.title.tracking,
    trackWidth(width, sectionShares, theme.columnGap),
    theme.titleSizes
  );
