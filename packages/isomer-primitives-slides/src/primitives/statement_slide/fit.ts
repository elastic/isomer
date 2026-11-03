/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { statement, statementFit } from '../../theme/components/statement';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import type { StepLayout } from '../layout';
import { sizeForProse } from '../size';

import type { StatementSlideNode } from './schema';

/** The node's own `size`, else the largest step `statementFit` holds the statement at, weighed heavier in a layout narrower than its measure. */
export const statementStep = (
  { text, size }: Pick<StatementSlideNode, 'text' | 'size'>,
  layout: Pick<StepLayout, 'width' | 'crowding'>
): SlideSize =>
  sizeForProse(size, text, statementFit, layout, scalePx(statement.maxWidth));
