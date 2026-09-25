/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideRenderNode}. */
export const catalog = {
  type: 'slideRender',
  purpose:
    'Show the audience real output: another slide or composition exactly as one surface renders it.',
  useWhen: [
    'The slide argues that something renders a certain way and should show that render, not describe it.',
    'You want a thumbnail of another slide in the deck beside the source or facts that produced it.',
  ],
  avoidWhen: [
    'The same composition should appear on several surfaces side by side; use slideRenderGrid.',
    'You are showing where output lands (a chat, a terminal) and will author its content as nodes; use slideWindow.',
    'You are showing the source or JSON, not its output; use slideCode.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
