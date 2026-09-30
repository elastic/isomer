/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideRenderContext } from '../../render/context';
import { sequenceFit } from '../../theme/components/sequence';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import { sizeForLoad } from '../size';

import type { SlideSequenceNode } from './schema';

/** The step a sequence draws at in `context`, from its message count. */
export const sequenceStep = (
  { size, messages }: SlideSequenceNode,
  context: SlideRenderContext | undefined
): SlideSize =>
  sizeForLoad(
    size,
    messages.length,
    sequenceFit,
    slideLayout(context).crowding
  );
