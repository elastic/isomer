/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it, vi } from 'vitest';

import { chartsFrame } from '../frame';
import { chartsPack } from '../pack';
import { xyTimeSeries } from '../primitives/xy_chart/examples';
import { resolveXy } from '../primitives/xy_chart/resolve';

vi.mock('../primitives/xy_chart/resolve', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../primitives/xy_chart/resolve')>();
  return { ...original, resolveXy: vi.fn(original.resolveXy) };
});

describe('a snapshot render with the pack resolver', () => {
  it.each(['light', 'dark'] as const)(
    'resolves an xyChart once for its estimate and its drawn box: %s',
    (theme) => {
      const runtime = createIsomerRuntime({
        packs: [chartsPack],
        frames: { page: chartsFrame },
      });
      vi.mocked(resolveXy).mockClear();
      runtime.surfaces.snapshot.render(
        { type: 'view', body: [xyTimeSeries] },
        { theme }
      );
      expect(resolveXy).toHaveBeenCalledTimes(1);
    }
  );
});
