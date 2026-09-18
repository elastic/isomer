/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createContext,
  createElement,
  Fragment,
  type ReactNode,
  useContext,
} from 'react';

import type { Composition } from '../../composition';
import type { RenderTheme } from '../../composition/named_color';
import type { PrimitiveNode, PrimitiveRenderContext } from '../../define';

/** A pack's React renderer for one node of its own type. */
export interface ReactContentDispatcher<
  TNode extends PrimitiveNode,
  TContext = PrimitiveRenderContext,
> {
  /** Must be side-effect free: the HTML surface calls it twice, once to collect styles and once to render. */
  renderReact(node: TNode, context?: TContext): ReactNode;
}

export interface ReactContentOptions {
  /**
   * Renders the composition's title and subtitle as the leading `h2` / `p.sub`.
   * Pass `false` when the host already shows the title itself; the title still
   * backs the wrapper's `aria-label`.
   */
  heading?: boolean;
}

/**
 * Dispatcher that created this React tree. Nested primitive components read it
 * because React invokes those children after the parent renderer has returned.
 * `context` is untyped: each pack narrows `PrimitiveRenderContext`.
 */
export type ReactTreeDispatcher = {
  renderReact: (node: PrimitiveNode, context?: object) => ReactNode;
};

export const PrimitiveDispatcherContext =
  createContext<ReactTreeDispatcher | null>(null);

/** The dispatcher rendering the enclosing tree, or `null` outside one. */
export const useReactPrimitiveDispatcher = (): ReactTreeDispatcher | null =>
  useContext(PrimitiveDispatcherContext);

/**
 * A composition's heading and body as React nodes, without the surrounding
 * document or wrapper element.
 *
 * `dispatcher` is published on {@link PrimitiveDispatcherContext} so a
 * primitive that renders children can reach it — see
 * {@link ReactTreeDispatcher}.
 */
export const renderCompositionContent = <
  TNode extends PrimitiveNode,
  TContext = PrimitiveRenderContext,
>(
  composition: Composition<TNode>,
  dispatcher: ReactContentDispatcher<TNode, TContext>,
  context: TContext,
  { heading = true }: ReactContentOptions = {}
): ReactNode =>
  createElement(
    PrimitiveDispatcherContext.Provider,
    {
      value: dispatcher as ReactTreeDispatcher,
    },
    createElement(
      Fragment,
      null,
      ...[
        heading && composition.title
          ? createElement('h2', { key: 'title' }, composition.title)
          : null,
        heading && composition.subtitle
          ? createElement(
              'p',
              { key: 'subtitle', className: 'sub' },
              composition.subtitle
            )
          : null,
        ...composition.body.map((node, index) =>
          createElement(RenderedCompositionNode<TNode, TContext>, {
            key: `body-${index}`,
            node,
            context,
            dispatcher,
          })
        ),
      ].filter(Boolean)
    )
  );

interface RenderedCompositionNodeProps<
  TNode extends PrimitiveNode,
  TContext = PrimitiveRenderContext,
> {
  node: TNode;
  context: TContext;
  dispatcher: ReactContentDispatcher<TNode, TContext>;
}

const RenderedCompositionNode = <TNode extends PrimitiveNode, TContext>({
  node,
  context,
  dispatcher,
}: RenderedCompositionNodeProps<TNode, TContext>): ReactNode =>
  dispatcher.renderReact(node, context);

/** Options for {@link wrapCompositionContent}. */
export interface CompositionWrapperOptions {
  /** Adds the `framed` class. Defaults to `true`. */
  framed?: boolean;
  /** Adds the `fluid` class. */
  fluid?: boolean;
  /** Sets `data-theme`; `auto` (the default) sets nothing so the page's scheme applies. */
  theme?: RenderTheme;
  /** Used only when the composition has neither `meta.ariaLabel` nor a `title`. Defaults to `'View'`. */
  defaultAriaLabel?: string;
}

/**
 * The one `.isomer[.framed][.fluid]` `section` every surface wraps rendered
 * content in: the `html` surface's document wrapper and a React host's.
 */
export const wrapCompositionContent = <TNode extends PrimitiveNode>(
  content: ReactNode,
  composition: Composition<TNode>,
  {
    framed = true,
    fluid = false,
    theme = 'auto',
    defaultAriaLabel = 'View',
  }: CompositionWrapperOptions = {}
): ReactNode =>
  createElement(
    'section',
    {
      className: ['isomer', framed ? 'framed' : '', fluid ? 'fluid' : '']
        .filter(Boolean)
        .join(' '),
      role: 'group',
      'aria-label':
        composition.meta?.ariaLabel ?? composition.title ?? defaultAriaLabel,
      ...(theme === 'auto' ? {} : { 'data-theme': theme }),
    },
    content
  );
