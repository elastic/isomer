/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideCodeNode } from './schema';

/** Canonical {@link SlideCodeNode} example. */
export const example: SlideCodeNode = {
  type: 'slideCode',
  label: 'Composition',
  language: 'json',
  code: '{ "type": "view", "body": [] }',
};

/** Bare block: no label, no language hint, multi-line source. */
export const bareExample: SlideCodeNode = {
  type: 'slideCode',
  code: 'const runtime = createIsomerRuntime({\n  packs: [slidesPack],\n});',
};

/** Conformance examples for {@link SlideCodeNode}. */
export const examples: SlideCodeNode[] = [example, bareExample];
