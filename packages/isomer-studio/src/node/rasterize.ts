/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TakumiBackend } from '@elastic/isomer-image-takumi';
import type { Composition } from '@elastic/isomer-sdk';

import type { StudioRuntime } from '../config';

/** The tallest viewport the PNG is laid out in before it is cropped to its content. */
const MAX_PNG_HEIGHT = 8192;

/** Pixels per CSS pixel, so the PNG stays sharp on high-density displays. */
const PNG_SCALE = 2;

export type NodeRasterizer = (composition: Composition) => Promise<Buffer>;

/** Rasterizes with takumi, loaded on first use because it is native; `undefined` without a snapshot surface. */
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
    const render = (height: number) =>
      snapshot.render(composition, { height, onValidationError: 'collect' });
    const { height } = await takumi.measure(render(MAX_PNG_HEIGHT));
    return takumi.png(render(Math.min(Math.ceil(height), MAX_PNG_HEIGHT)), {
      scale: PNG_SCALE,
    });
  };
};
