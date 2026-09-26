/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PrimitiveNode,
  PrimitiveRenderContext,
  PrimitiveStyleCollector,
} from '@elastic/isomer-sdk';
import {
  enhancementScript,
  type HTMLEnhancementScope,
  type HTMLRenderOptions,
  type HTMLStyleAdapter,
  resolveEnhancements,
} from '@elastic/isomer-sdk/html';

/**
 * `adapter` with the requested enhancements the body has content for set as
 * `context.enhancements`, and their scripts emitted.
 */
export const withEnhancements = <
  TNode extends PrimitiveNode,
  TCollector extends PrimitiveStyleCollector,
  TContext extends PrimitiveRenderContext,
>(
  adapter: HTMLStyleAdapter<TNode, TCollector, TContext>
): HTMLStyleAdapter<TNode, TCollector, TContext> => {
  const resolve = (
    body: readonly PrimitiveNode[],
    { enhancements }: HTMLRenderOptions,
    { walk, definitions }: HTMLEnhancementScope
  ) => resolveEnhancements(body, enhancements, walk, definitions);
  // Every render calls `collectViewStyles` before `createRenderContext`, with the same collector.
  const resolved = new WeakMap<TCollector, ReadonlySet<string>>();
  return {
    ...adapter,
    collectViewStyles: (...args) => {
      adapter.collectViewStyles?.(...args);
      const [{ body }, , collector, , options, scope] = args;
      resolved.set(collector, resolve(body, options, scope));
    },
    createRenderContext: (collector, options) => ({
      ...adapter.createRenderContext(collector, options),
      enhancements: resolved.get(collector) ?? new Set<string>(),
    }),
    getScriptText: (composition, options, scope) =>
      [
        adapter.getScriptText?.(composition, options, scope) ?? '',
        enhancementScript(
          resolve(composition.body, options, scope),
          scope.definitions
        ),
      ]
        .filter(Boolean)
        .join('\n'),
  };
};
