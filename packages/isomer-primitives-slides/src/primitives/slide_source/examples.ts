/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideSourceNode } from './schema';

/** Canonical {@link SlideSourceNode} example. */
export const example: SlideSourceNode = {
  type: 'slideSource',
  text: 'Support tickets tagged “refund”, January to June',
};

/** A source that names a file, set in code. */
export const codeExample: SlideSourceNode = {
  type: 'slideSource',
  text: 'Nightly export of `orders.csv`, counted on 3 March',
};

/** Conformance examples for {@link SlideSourceNode}. */
export const examples: SlideSourceNode[] = [example, codeExample];
