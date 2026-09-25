/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';

import type { BodyNode } from '../../body_node';
import type { SlideRenderSurface } from '../../theme/variants';

/** Another slide or composition as one surface draws it. */
export interface SlideRenderNode extends PrimitiveNode {
  /** Discriminator. Always `slideRender`. */
  type: 'slideRender';
  /** Host reference to the slide to embed, e.g. its slug. The pack never resolves it. */
  slide?: string;
  /** What to render; its body nodes are drawn on {@link SlideRenderNode.surface}. */
  composition?: Composition<BodyNode>;
  /** The surface to render {@link SlideRenderNode.composition} on. */
  surface: SlideRenderSurface;
  /** Line above the panel. */
  caption?: string;
}
