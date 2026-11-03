/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matrixFit } from '../../theme/components/matrix';
import type { SlideSize } from '../../theme/variants';
import type { StepLayout } from '../layout';
import { sizeForLoad } from '../size';

import type { SlideMatrixNode } from './schema';

/** The node's own `size`, else the largest step whose budget holds its rows. */
export const matrixStep = (
  { rows, size }: Pick<SlideMatrixNode, 'rows' | 'size'>,
  { crowding }: Pick<StepLayout, 'crowding'>
): SlideSize => sizeForLoad(size, rows.length, matrixFit, crowding);
