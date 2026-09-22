/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideFlowNode } from './schema';

/** Canonical {@link SlideFlowNode} example. */
export const example: SlideFlowNode = {
  type: 'slideFlow',
  label: 'Data boundary',
  nodes: ['Data', 'Host', 'getSpec()', 'Renderer', 'Surface'],
  boundaryAfter: 2,
};

/** No label and no boundary: every connector keeps the accent color. */
export const plainExample: SlideFlowNode = {
  type: 'slideFlow',
  nodes: ['Author', 'Validate', 'Render'],
};

/** Conformance examples for {@link SlideFlowNode}. */
export const examples: SlideFlowNode[] = [example, plainExample];
