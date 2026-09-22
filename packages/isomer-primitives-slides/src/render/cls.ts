/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StyleHandle } from '@elastic/distillate';

import type { SlideRenderContext } from './context';

/** Resolves Distillate handles through the host adapter, or falls back to readable names. */
export const cls = (
  context: SlideRenderContext | undefined,
  ...handles: Array<StyleHandle | undefined>
): string => {
  const present = handles.filter(
    (handle): handle is StyleHandle => handle !== undefined
  );
  const { resolveClassName } = context ?? {};
  return resolveClassName
    ? resolveClassName(...present)
    : present.map(({ readableName }) => readableName).join(' ');
};
