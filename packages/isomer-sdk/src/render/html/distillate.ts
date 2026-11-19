/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode, StyleHandle } from '../../define/primitive_module';
import type {
  DistilleryCollector,
  DistilleryHandle,
  PackDistillery,
} from '../../pack/distillery';
import { STYLE_SCOPE } from '../style_scope';

import type { HTMLStyleAdapter } from './envelope';

/** One render's collectors, one per distillery, in the adapter's order. */
export interface DistilleryCollectors {
  readonly collectors: readonly DistilleryCollector[];
}

/**
 * The HTML style adapter for packs authored in Distillate: each handle a
 * renderer resolves is recorded by the distillery whose registry owns its
 * module, and the stylesheet joins every distillery's rules in order.
 *
 * Readable names only: compact names depend on the complete collected set,
 * which does not exist until the markup naming them is written.
 */
export const createDistillateStyleAdapter = (
  distilleries: readonly PackDistillery[]
): HTMLStyleAdapter<PrimitiveNode, DistilleryCollectors> => {
  const engines = [...new Set(distilleries)];
  const owners = new WeakMap<object, number>();
  // A handle no registry owns is recorded by the first distillery.
  const ownerOf = (handle: DistilleryHandle): number => {
    let owner = owners.get(handle);
    if (owner === undefined) {
      owner = Math.max(
        0,
        engines.findIndex((engine) =>
          engine.registry.module(handle.moduleName)?.handleList.includes(handle)
        )
      );
      owners.set(handle, owner);
    }
    return owner;
  };
  return {
    createCollector: () => ({
      collectors: engines.map((engine) => engine.artifactCollector('readable')),
    }),
    createRenderContext: (collector) => ({
      resolveClassName: (...handles: StyleHandle[]) => {
        // Renderers pass Distillate handles, typed by the SDK as its narrower `StyleHandle`.
        const routed = handles as unknown as readonly DistilleryHandle[];
        collector.collectors.forEach((target, index) => {
          const owned = routed.filter((handle) => ownerOf(handle) === index);
          if (owned.length > 0) {
            target.useHandles(owned);
          }
        });
        return handles.map(({ readableName }) => readableName).join(' ');
      },
      [STYLE_SCOPE]: collector,
    }),
    renderStyles: ({ collectors }, { scheme }) =>
      engines
        .map((engine, index) =>
          engine.renderStyles(
            collectors[index]!,
            undefined,
            scheme ? { scheme } : undefined
          )
        )
        .filter(Boolean)
        .join('\n'),
  };
};
