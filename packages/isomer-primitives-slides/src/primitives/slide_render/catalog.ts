/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import type { SlideGroup } from '../../groups';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideRenderNode}. */
export const catalog = {
  type: 'slideRender',
  name: 'Render',
  group: 'Renders',
  description:
    'One render. Needs a `slide` reference or a `body`; the body holds whole slides but never another render.',
  purpose:
    'Show the audience real output: another slide, or a few slide nodes, exactly as one surface renders it.',
  useWhen: [
    'The slide argues that something renders a certain way and should show that render, not describe it.',
    'You want a thumbnail of another slide in the deck beside the source or facts that produced it; name it in `slide` and the host fills in `body`.',
  ],
  avoidWhen: [
    'The same content should appear on several surfaces side by side; use slideRenderGrid.',
    'You are showing where output lands (a chat, a terminal) and will author its content as nodes; use slideWindow.',
    'You are showing the source, not its output; use slideCode.',
    'You want to point at parts of the render and explain each one; use slideAnnotatedRender.',
  ],
  example,
} satisfies PrimitiveCatalogEntry<SlideGroup>;
