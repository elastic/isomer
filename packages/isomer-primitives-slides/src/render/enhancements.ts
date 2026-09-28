/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EnhancementDefinition,
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

import { withContextFields } from './context_view';

/**
 * `adapter` with the requested enhancements the body has content for set as
 * `context.enhancements`, and the scripts of those among `own` emitted. `own`
 * is the pack's enhancement ids, so a runtime composing several packs that
 * wrap their adapters this way emits each script once.
 */
export const withEnhancements = <
  TNode extends PrimitiveNode,
  TCollector extends PrimitiveStyleCollector,
  TContext extends PrimitiveRenderContext,
>(
  adapter: HTMLStyleAdapter<TNode, TCollector, TContext>,
  own: readonly string[]
): HTMLStyleAdapter<TNode, TCollector, TContext> => {
  const owned = new Set(own);
  const resolve = (
    body: readonly PrimitiveNode[],
    { enhancements }: HTMLRenderOptions,
    { walk }: HTMLEnhancementScope,
    definitions: readonly EnhancementDefinition[]
  ) => resolveEnhancements(body, enhancements, walk, definitions);
  // Every render calls `collectViewStyles` before `createRenderContext`, with the same collector.
  const resolved = new WeakMap<TCollector, ReadonlySet<string>>();
  return {
    ...adapter,
    collectViewStyles: (...args) => {
      adapter.collectViewStyles?.(...args);
      const [{ body }, , collector, , options, scope] = args;
      resolved.set(collector, resolve(body, options, scope, scope.definitions));
    },
    createRenderContext: (collector, options) =>
      withContextFields(adapter.createRenderContext(collector, options), {
        enhancements: resolved.get(collector) ?? new Set<string>(),
      } as Partial<TContext>),
    getScriptText: (composition, options, scope) => {
      const definitions = scope.definitions.filter(({ id }) => owned.has(id));
      return [
        adapter.getScriptText?.(composition, options, scope) ?? '',
        enhancementScript(
          resolve(composition.body, options, scope, definitions),
          definitions
        ),
      ]
        .filter(Boolean)
        .join('\n');
    },
  };
};
