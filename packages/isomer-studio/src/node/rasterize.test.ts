/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @vitest-environment node */

import type { Composition } from '@elastic/isomer-sdk';

import type { StudioRuntime } from '../config';
import { PNG_SCALE } from '../types';

import { createRasterizer } from './rasterize';

const png = vi.fn(() => Promise.resolve(Buffer.from('png')));

vi.mock('@elastic/isomer-image-takumi', () => ({
  createTakumiImageBackend: () => ({ png }),
}));

describe('createRasterizer', () => {
  it('rasterizes the snapshot at the geometry the frame estimates', async () => {
    const snapshot = { html: '<div/>', css: '', width: 960, height: 540 };
    const render = vi.fn(() => snapshot);
    const runtime = {
      surfaces: { snapshot: { render } },
    } as unknown as StudioRuntime;
    const composition: Composition = { type: 'view', body: [] };

    const rasterize = createRasterizer(runtime);
    await rasterize?.(composition);

    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(composition, {
      onValidationError: 'collect',
    });
    expect(png).toHaveBeenCalledWith(snapshot, { scale: PNG_SCALE });
  });

  it('is undefined without a snapshot surface', () => {
    expect(
      createRasterizer({ surfaces: {} } as unknown as StudioRuntime)
    ).toBeUndefined();
  });
});
