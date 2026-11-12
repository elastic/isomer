/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createVarsModule,
  type LocalVarGroup,
  type StyleHandle,
} from '@elastic/isomer-primitives-charts/scene';

interface StaticStyles {
  readonly handles: Readonly<Record<'drawing' | 'fluidDrawing', StyleHandle>>;
  readonly vars: {
    readonly box: LocalVarGroup<
      'width' | 'height' | 'maxWidth' | 'aspectRatio'
    >;
  };
  readonly stylesheet: () => string;
}

export const staticModule: StaticStyles = createVarsModule(
  'chartsElasticStatic',
  (vars) => ({
    box: vars('box', {
      width: 'auto',
      height: 'auto',
      maxWidth: 'none',
      aspectRatio: 'auto',
    }),
  }),
  ({ css }, { box }) => ({
    /** A drawing at the size it was drawn at. */
    drawing: css`
      ${box}
      display: flex;
      width: ${box.width};
      height: ${box.height};
    `,
    /** A drawing scaled to its container at its own aspect ratio. */
    fluidDrawing: css`
      ${box}
      display: flex;
      width: 100%;
      max-width: ${box.maxWidth};
      aspect-ratio: ${box.aspectRatio};
    `,
  })
);

/**
 * The rules this renderer draws its box with, for a host that draws the
 * `react` surface and ships the CSS itself, beside the pack's
 * `chartsStylesheet()`.
 */
export const elasticChartsStaticStylesheet = (): string =>
  staticModule.stylesheet();
