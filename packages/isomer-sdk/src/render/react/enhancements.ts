/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildNodeWalker } from '../../composition/body_node_base';
import type { PrimitiveNode } from '../../composition/node';
import {
  type EnhancementDefinition,
  resolveEnhancements,
} from '../../pack/enhancements';
import { withNodeAnchors } from '../anchors';
import { contextWith } from '../context_view';

/**
 * The `definitions` that apply to `body`, the first of each id and limited to
 * `requested` ids when given, and `context` for a React render of it: carrying their ids as `context.enhancements`, with
 * `context.anchors` on when one declares `anchors: true`. `context` is viewed,
 * not copied, as the HTML surface does.
 */
export const applyEnhancements = <TContext>(
  context: TContext,
  body: readonly PrimitiveNode[],
  walk: ChildNodeWalker,
  definitions: readonly EnhancementDefinition[],
  requested?: readonly string[]
): { context: TContext; applied: EnhancementDefinition[] } => {
  const applied = resolveEnhancements(body, walk, definitions, requested);
  const ids = new Set(applied.map(({ id }) => id));
  const enhanced = contextWith(context, 'enhancements', ids);
  return {
    context: applied.some(({ anchors }) => anchors)
      ? withNodeAnchors(enhanced)
      : enhanced,
    applied,
  };
};
