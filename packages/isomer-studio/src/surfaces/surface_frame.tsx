/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import type { SerializedStyles } from '@emotion/react';

/** Holds a surface's render, apart from its diagnostics, so a clipping frame never hides them. */
export const SurfaceFrame = ({
  frameCss,
  children,
}: {
  frameCss?: SerializedStyles | undefined;
  children: ReactNode;
}) =>
  frameCss ? (
    <div css={frameCss} data-test-subj="surfaceFrame">
      {children}
    </div>
  ) : (
    <>{children}</>
  );
