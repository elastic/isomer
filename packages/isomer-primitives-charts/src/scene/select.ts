/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SceneEnvironment, SceneKind, SceneRenderer } from './types';

/**
 * The renderer that draws a Scene: the first in `preferences` that runs in
 * `environment` and supports `kind`. `undefined` when none does.
 */
export const selectSceneRenderer = <TOutput>(
  preferences: readonly SceneRenderer<TOutput>[],
  kind: SceneKind,
  environment: SceneEnvironment
): SceneRenderer<TOutput> | undefined =>
  preferences.find(
    (renderer) =>
      renderer.environments.includes(environment) && renderer.supports(kind)
  );
