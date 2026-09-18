/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type {
  Composition,
  PrimitiveDispatcher,
  PrimitiveNode,
  PrimitiveRenderContext,
  ReactContextArg,
} from '@elastic/isomer-sdk';
import {
  type CompositionWrapperOptions,
  renderCompositionContent,
  wrapCompositionContent,
} from '@elastic/isomer-sdk/react';

import type { RuntimePackTypes } from '../pack_types';

export type { ReactContextArg };

/** Options for {@link ReactSurface.render} and, without `heading`, {@link ReactSurface.renderNode}. */
export type ReactRenderOptions<TRenderContext = PrimitiveRenderContext> = {
  /** Renders the leading `h2` / `p.sub`. Defaults to `true`. */
  heading?: boolean;
  /**
   * Wraps the content in the `.isomer[.framed][.fluid]` `section` the `html`
   * surface emits. `true` takes the defaults; an object sets `framed`,
   * `fluid`, `theme`, and `defaultAriaLabel`. Absent means bare content.
   */
  wrapper?: boolean | CompositionWrapperOptions;
} & (Record<string, never> extends TRenderContext
  ? { context?: TRenderContext }
  : { context: TRenderContext });

/** Options for {@link ReactSurface.renderNode}: a lone node has no heading to draw. */
export type ReactRenderNodeOptions<TRenderContext = PrimitiveRenderContext> =
  Omit<ReactRenderOptions<TRenderContext>, 'heading'>;

/**
 * The options argument, optional only when omitting it is sound: a pack that
 * narrows the render context with a required member makes it mandatory.
 */
export type ReactRenderArgs<
  TRenderContext,
  TOptions extends ReactRenderNodeOptions<TRenderContext> =
    ReactRenderOptions<TRenderContext>,
> =
  Record<string, never> extends TRenderContext
    ? [options?: TOptions]
    : [options: TOptions];

/**
 * Renders a composition or node to a React tree.
 *
 * The one non-validating surface, deliberately. React is the interactive
 * target, where a partial render beats a thrown error. A host that wants the
 * other behaviour calls `validate` itself first.
 */
export interface ReactSurface<TRenderContext = PrimitiveRenderContext> {
  /** Always `false`: see the note above. */
  readonly validating: false;
  /** Renders a full composition to a React tree, bare unless `wrapper` is set. */
  render(
    composition: Composition,
    ...args: ReactRenderArgs<TRenderContext>
  ): ReactNode;
  /** Renders a single primitive node to a React tree; a lone node has no heading to draw. */
  renderNode(
    node: PrimitiveNode,
    ...args: ReactRenderArgs<
      TRenderContext,
      ReactRenderNodeOptions<TRenderContext>
    >
  ): ReactNode;
}

/**
 * Creates the `react` {@link RuntimeSurfaces} entry.
 *
 * @param defaultAriaLabel The `wrapper` fallback when the composition has
 * neither `meta.ariaLabel` nor a `title`; a `wrapper` object may override it.
 */
export const createReactSurface = <TRenderContext = PrimitiveRenderContext>(
  dispatcher: PrimitiveDispatcher<
    PrimitiveNode,
    RuntimePackTypes<TRenderContext>
  >,
  defaultAriaLabel = 'View'
): ReactSurface<TRenderContext> => {
  const renderWith = (
    composition: Composition,
    heading: boolean,
    options: ReactRenderNodeOptions<TRenderContext> | undefined
  ): ReactNode => {
    // `{}` only ever runs when `context` was optional, which
    // `ReactRenderOptions` allows exactly when `{}` is a complete context.
    const content = renderCompositionContent(
      composition,
      dispatcher,
      options?.context ?? ({} as TRenderContext),
      { heading }
    );
    const { wrapper } = options ?? {};
    if (!wrapper) {
      return content;
    }
    return wrapCompositionContent(content, composition, {
      defaultAriaLabel,
      ...(wrapper === true ? {} : wrapper),
    });
  };

  return {
    validating: false,
    render: (composition, ...[options]) =>
      renderWith(composition, options?.heading ?? true, options),
    renderNode: (node, ...[options]) =>
      renderWith({ type: 'view', body: [node] }, false, options),
  };
};
