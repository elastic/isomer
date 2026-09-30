/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideRenderGridNode}. */
export const catalog = {
  type: 'slideRenderGrid',
  purpose:
    'Prove one slide works everywhere by showing it as several surfaces render it, side by side.',
  useWhen: [
    'The point of the slide is that the same content reaches several places: a page, an email, chat, a terminal.',
    'The audience should compare how each surface renders one slide.',
  ],
  avoidWhen: [
    'Only one surface matters; use slideRender.',
    'You are showing where output lands and will author its content as nodes; use slideWindow.',
    'You are showing the source, not its output; use slideCode.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
