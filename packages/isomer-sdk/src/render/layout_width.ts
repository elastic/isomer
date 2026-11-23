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
 * laid out in, in pixels: a `snapshot` frame's content width, or an `html`
 * render's `width`.
 */
export const withLayoutWidth = <TContext>(
  context: TContext,
  width: number
): TContext => contextWith(context, LAYOUT_WIDTH, width);

/** The width a surface laid this render out in, or `undefined` where none was stated. */
export const layoutWidthOf = (context: unknown): number | undefined => {
  const width: unknown = isObjectLike(context)
    ? Reflect.get(context, LAYOUT_WIDTH)
    : undefined;
  return typeof width === 'number' ? width : undefined;
};
