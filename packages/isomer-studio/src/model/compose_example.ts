/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';

import type { StudioCompose, StudioConfig, StudioTheme } from '../config';

/** A `view` composition with `nodes` as its body. */
export const defaultCompose: StudioCompose = (nodes, { theme }) => ({
  type: 'view',
  body: [...nodes],
  theme,
});

/** The config's `compose`, else one that shows a lone node through `previewExample`. */
export const composeOf = ({
  compose,
  previewExample,
}: Pick<StudioConfig, 'compose' | 'previewExample'>):
  StudioCompose | undefined =>
  compose ??
  (previewExample &&
    ((nodes, { theme }) => {
      const [only] = nodes;
      return only && nodes.length === 1
        ? { ...previewExample(only), theme }
        : defaultCompose(nodes, { theme });
    }));

/** The one way the Studio, its static build, and `check` turn example nodes into a composition. */
export const composeExample = (
  compose: StudioCompose | undefined,
  nodes: readonly PrimitiveNode[],
  theme: StudioTheme
): Composition => (compose ?? defaultCompose)(nodes, { theme });
