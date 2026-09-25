/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createChildNodeWalker } from '../../composition/body_node_base';
import type { Composition } from '../../composition/composition';
import type {
  PrimitiveNode,
  PrimitiveStyleCollector,
  StyledRenderContext,
} from '../../define/primitive_module';

import type { EnhancementDefinition } from './enhancements';
import type {
  HTMLEnhancementScope,
  HTMLRenderDispatcher,
  HTMLRenderOptions,
  HTMLStyleAdapter,
} from './envelope';

/**
 * The html surface's CSS for a render the caller does itself. Hand `context` to
 * that render, then read `css()` once it has finished: the styles are the ones
 * its renderers used. A subtree that suspends records its styles after that.
 */
export interface HTMLStyleCollection<TContext = StyledRenderContext> {
  /** The render context every `react` renderer receives; it records the styles they use. */
  readonly context: TContext;
  /** The CSS for everything rendered with {@link HTMLStyleCollection.context}, with no `<style>` wrapper. */
  readonly css: () => string;
}

export interface HTMLStyleCollectionOptions<
  TNode extends PrimitiveNode,
  TCollector extends PrimitiveStyleCollector = PrimitiveStyleCollector,
  TContext = StyledRenderContext,
> {
  dispatcher: HTMLRenderDispatcher<TNode, TCollector, TContext>;
  styleAdapter?: HTMLStyleAdapter<TNode, TCollector, TContext> | undefined;
  options?: HTMLRenderOptions;
  enhancementDefinitions?: readonly EnhancementDefinition[];
}

/** The collection half of an html render, for {@link renderHTMLWithDispatcher} and for a host rendering the tree itself. `options` are already resolved. */
export const startStyleCollection = <
  TNode extends PrimitiveNode,
  TCollector extends PrimitiveStyleCollector,
  TContext,
>(
  composition: Composition<TNode>,
  {
    dispatcher,
    styleAdapter,
    options = {},
    enhancementDefinitions = [],
  }: HTMLStyleCollectionOptions<TNode, TCollector, TContext>
): (HTMLStyleCollection<TContext> & { collector: TCollector }) | undefined => {
  if (!styleAdapter) {
    return undefined;
  }
  const collector = styleAdapter.createCollector(options);
  const scope: HTMLEnhancementScope = {
    walk: createChildNodeWalker(dispatcher.definitions),
    definitions: enhancementDefinitions,
  };
  styleAdapter.collectWrapperStyles?.(collector, options);
  styleAdapter.collectViewStyles?.(
    composition,
    dispatcher,
    collector,
    { fluid: Boolean(options.fluid) },
    options,
    scope
  );
  return {
    collector,
    context: styleAdapter.createRenderContext(collector, options),
    css: () => {
      styleAdapter.collectAfterRender?.(composition, collector, options);
      return styleAdapter.renderStyles(collector, options);
    },
  };
};

/**
 * The CSS the html surface would emit for `composition`, collected from a
 * render the caller does itself, so a host rendering React into a shadow root
 * renders once instead of alongside {@link renderHTMLWithDispatcher}.
 */
export const createHTMLStyleCollection = <
  TNode extends PrimitiveNode,
  TCollector extends PrimitiveStyleCollector = PrimitiveStyleCollector,
  TContext = StyledRenderContext,
>(
  composition: Composition<TNode>,
  settings: HTMLStyleCollectionOptions<TNode, TCollector, TContext>
): HTMLStyleCollection<TContext> => {
  const { styleAdapter, options = {} } = settings;
  const resolved =
    styleAdapter?.resolveOptions?.(composition, options) ?? options;
  const started = startStyleCollection(composition, {
    ...settings,
    options: resolved,
  });
  // No adapter means no class names and no css vars to resolve.
  return started
    ? { context: started.context, css: started.css }
    : { context: {} as TContext, css: () => '' };
};
