/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contextWith, isObjectLike } from './context_view';

const LAYOUT_WIDTH = Symbol.for('@elastic/isomer-sdk/layout-width');

/**
 * A view of `context` that tells the nodes drawn with it the width they are
 * laid out in, in pixels: a `snapshot` frame's content width, an `html`
 * render's `width`, or the room a container leaves a child. A context that is
 * neither an object nor a function carries nothing and is returned as it is.
 */
export const withLayoutWidth = <TContext>(
  context: TContext,
  width: number
): TContext => contextWith(context, LAYOUT_WIDTH, width);

/** The width the nodes drawn with `context` are laid out in, or `undefined` where none was stated. */
export const layoutWidthOf = (context: unknown): number | undefined => {
  const width: unknown = isObjectLike(context)
    ? Reflect.get(context, LAYOUT_WIDTH)
    : undefined;
  return typeof width === 'number' ? width : undefined;
};
