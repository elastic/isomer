/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { quote, quoteFit } from '../../theme/components/quote';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import type { StepLayout } from '../layout';
import { sizeForProse } from '../size';

import type { QuoteSlideNode } from './schema';

/** The node's own `size`, else the largest step `quoteFit` holds the quote at, weighed heavier in a layout narrower than its measure. */
export const quoteStep = (
  { text, size }: Pick<QuoteSlideNode, 'text' | 'size'>,
  layout: Pick<StepLayout, 'width' | 'crowding'>
): SlideSize =>
  sizeForProse(size, text, quoteFit, layout, scalePx(quote.maxWidth));
