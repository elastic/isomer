/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { SlideRenderNode } from '../slide_render/types';

import type { SlideAnnotatedRenderPin } from './schema';

/** A render with numbered pins on it, and a legend that explains each pin. */
export interface SlideAnnotatedRenderNode extends PrimitiveNode {
  /** Discriminator. Always `slideAnnotatedRender`. */
  type: 'slideAnnotatedRender';
  /** The render the pins sit on. */
  render: SlideRenderNode;
  /** Pins in legend order; each is numbered by its position. */
  pins: SlideAnnotatedRenderPin[];
}
