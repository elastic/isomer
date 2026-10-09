/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';

import type { StudioCompose, StudioTheme } from '../config';

/** A `view` composition with `nodes` as its body. */
export const defaultCompose: StudioCompose = (nodes, { theme }) => ({
  type: 'view',
  body: [...nodes],
  theme,
});

/** The one way the Studio, its static build, and `check` turn example nodes into a composition. */
export const composeExample = (
  compose: StudioCompose | undefined,
  nodes: readonly PrimitiveNode[],
  theme: StudioTheme
): Composition => (compose ?? defaultCompose)(nodes, { theme });
