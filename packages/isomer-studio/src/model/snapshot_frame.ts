/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';

import type { StudioConfig } from '../config';

/** `config` with its runtime's `snapshot` renders drawn in the frame {@link StudioConfig.snapshotFrame} names, and pages in the first one's; a frame the caller passes wins. */
export const withSnapshotFrame = (config: StudioConfig): StudioConfig => {
  const { snapshotFrame, runtime } = config;
  const { snapshot } = runtime.surfaces;
  if (!snapshotFrame || !snapshot) {
    return config;
  }
  const frameOf = (composition: Composition | undefined) => {
    const frame = composition && snapshotFrame(composition);
    return frame === undefined ? {} : { frame };
  };
  return {
    ...config,
    runtime: {
      ...runtime,
      surfaces: {
        ...runtime.surfaces,
        snapshot: {
          ...snapshot,
          render: (composition, options) =>
            snapshot.render(composition, {
              ...frameOf(composition),
              ...options,
            }),
          renderPages: (compositions, options) =>
            snapshot.renderPages(compositions, {
              ...frameOf(compositions[0]),
              ...options,
            }),
        },
      },
    },
  };
};
