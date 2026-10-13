/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TakumiBackend } from '@elastic/isomer-image-takumi';
import type { Composition } from '@elastic/isomer-sdk';

import type { StudioRuntime } from '../config';
import { PNG_SCALE } from '../types';

export type NodeRasterizer = (composition: Composition) => Promise<Buffer>;

/**
 * Rasterizes with takumi, loaded on first use because it is native; `undefined` without a snapshot surface.
 * The PNG takes the frame's own geometry, as the Snapshot preview does.
 */
export const createRasterizer = (
  runtime: StudioRuntime
): NodeRasterizer | undefined => {
  const { snapshot } = runtime.surfaces;
  if (!snapshot) {
    return undefined;
  }
  let backend: Promise<TakumiBackend> | undefined;
  const loadBackend = () =>
    (backend ??= import('@elastic/isomer-image-takumi').then(
      ({ createTakumiImageBackend }) => createTakumiImageBackend()
    ));

  return async (composition) => {
    const takumi = await loadBackend();
    return takumi.png(
      snapshot.render(composition, { onValidationError: 'collect' }),
      { scale: PNG_SCALE }
    );
  };
};
