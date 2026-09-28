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
import { withContextAnchors } from '../anchors';
import { contextWith } from '../context_view';
import type { CompositionWrapperOptions } from '../react/content';

import {
  anchorsFor,
  type EnhancementDefinition,
  resolveEnhancements,
} from './enhancements';
import type {
  HTMLEnhancementScope,
  HTMLRenderDispatcher,
  HTMLRenderOptions,
  HTMLStyleAdapter,
} from './envelope';

/**
 * The html surface's CSS for a render the caller does itself. Hand `context`
 * and `wrapper` to that render, then read `css()` once it has finished: the
 * styles are the ones its renderers used. A subtree that suspends records its
 * styles after that.
 */
export interface HTMLStyleCollection<TContext = StyledRenderContext> {
  /** The render context every `react` renderer receives; it records the styles they use. */
  readonly context: TContext;
  /** The wrapper the CSS was collected for, with the style adapter's resolved options; pass it as the render's `wrapper`. */
  readonly wrapper: Required<
    Pick<CompositionWrapperOptions, 'framed' | 'fluid' | 'theme'>
  >;
  /** The CSS for everything rendered with {@link HTMLStyleCollection.context}, with no `<style>` wrapper. Computed on the first read. */
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

/** `context` for a render outside the html surface: carrying the resolved `enhancements`, with node anchors on when `options` or one of those enhancements asks. */
const hostRenderContext = <TContext>(
  context: TContext,
  { body }: Composition,
  options: HTMLRenderOptions,
  { walk, definitions }: HTMLEnhancementScope
): TContext => {
  const enhancements = resolveEnhancements(
    body,
    options.enhancements,
    walk,
    definitions
  );
  const enhanced = contextWith(context, 'enhancements', enhancements);
  return anchorsFor(enhancements, options, definitions)
    ? withContextAnchors(enhanced)
    : enhanced;
};

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
):
  | (Omit<HTMLStyleCollection<TContext>, 'wrapper'> & { collector: TCollector })
  | undefined => {
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
  let css: string | undefined;
  return {
    collector,
    context: styleAdapter.createRenderContext(collector, options),
    css: () => {
      if (css === undefined) {
        styleAdapter.collectAfterRender?.(composition, collector, options);
        css = styleAdapter.renderStyles(collector, options);
      }
      return css;
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
  const {
    dispatcher,
    styleAdapter,
    options = {},
    enhancementDefinitions = [],
  } = settings;
  const resolved =
    styleAdapter?.resolveOptions?.(composition, options) ?? options;
  const started = startStyleCollection(composition, {
    ...settings,
    options: resolved,
  });
  const context = hostRenderContext(
    // No adapter means no class names and no css vars to resolve.
    started ? started.context : ({} as TContext),
    composition,
    resolved,
    {
      walk: createChildNodeWalker(dispatcher.definitions),
      definitions: enhancementDefinitions,
    }
  );
  const wrapper = {
    framed: resolved.framed ?? true,
    fluid: Boolean(resolved.fluid),
    theme: resolved.theme ?? composition.theme ?? 'auto',
  };
  return { context, wrapper, css: started ? started.css : () => '' };
};
