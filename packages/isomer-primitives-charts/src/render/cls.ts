/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StyleHandle } from '@elastic/distillate';
import type { StyledRenderContext } from '@elastic/isomer-sdk';

/** Resolves handles through the render's adapter, or to their readable names when it has none. */
export const cls = (
  context: Pick<StyledRenderContext, 'resolveClassName'> | undefined,
  ...handles: ReadonlyArray<StyleHandle | false | undefined>
): string => {
  const present = handles.filter((handle): handle is StyleHandle =>
    Boolean(handle)
  );
  return context?.resolveClassName
    ? context.resolveClassName(...present)
    : present.map(({ readableName }) => readableName).join(' ');
};
