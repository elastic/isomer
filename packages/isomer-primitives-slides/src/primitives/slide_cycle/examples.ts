/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideCycleNode } from './schema';

/** Canonical {@link SlideCycleNode} example. */
export const example: SlideCycleNode = {
  type: 'slideCycle',
  label: 'Agent loop',
  center: 'Until it parses',
  nodes: ['Authoring context', 'Model', 'parse', 'Errors'],
};

/** Three steps, no label, no center. */
export const plainExample: SlideCycleNode = {
  type: 'slideCycle',
  nodes: ['Author', 'Validate', 'Render'],
};

/** Conformance examples for {@link SlideCycleNode}. */
export const examples: SlideCycleNode[] = [example, plainExample];
