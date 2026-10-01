/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { BodyNode } from '../../body_node';
import type { SlideRenderSurface } from '../../theme/variants';

/** Another slide, or loose slide nodes, as one surface draws them. */
export interface SlideRenderNode extends PrimitiveNode {
  type: 'slideRender';
  /** Host reference, e.g. a slug; {@link resolveSlideRenders} fills `body` from it. */
  slide?: string;
  /** Usually one `slideFrame`. Not a walked child: its ids are its own. */
  body?: readonly BodyNode[];
  surface: SlideRenderSurface;
  caption?: string;
}
