/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StudioRuntime } from '../config';

import { appSurfaces } from './app_surface';

const runtime = {
  surfaces: { react: {}, markdown: {}, snapshot: {} },
} as unknown as StudioRuntime;

describe('appSurfaces', () => {
  it('lists the runtime surfaces, labeled, with PNG last when the host rasterizes', () => {
    expect(appSurfaces(runtime, true)).toEqual([
      { id: 'react', label: 'React' },
      { id: 'markdown', label: 'Markdown' },
      { id: 'snapshot', label: 'Snapshot' },
      { id: 'png', label: 'PNG' },
    ]);
  });

  it('leaves PNG out when the host cannot rasterize', () => {
    expect(appSurfaces(runtime, false).map(({ id }) => id)).not.toContain(
      'png'
    );
  });
});
