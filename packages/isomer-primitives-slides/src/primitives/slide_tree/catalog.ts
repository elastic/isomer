/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideTreeNode}. */
export const catalog = {
  type: 'slideTree',
  name: 'Tree',
  purpose:
    'Show what is inside a folder and what each file is for, so the audience can find their way around it.',
  useWhen: [
    'You walk through the layout of a package, service, or repository folder.',
    'Each file or subfolder earns a short note on its job.',
  ],
  avoidWhen: [
    'The items are not files or folders; use slideList.',
    'The entries are terms to learn rather than paths; use slideDefinitions.',
    'The point is the code inside a file; use slideCode.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
