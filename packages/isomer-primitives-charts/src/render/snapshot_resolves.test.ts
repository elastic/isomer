/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it, vi } from 'vitest';

import { chartsFrame } from '../frame';
import { createChartsPack } from '../pack';
import { xyTimeSeries } from '../primitives/xy_chart/examples';
import { resolveXy } from '../primitives/xy_chart/resolve';
import type { Scene } from '../scene';
import { SCENE_KINDS } from '../scene/base';

import type { ReactSceneRenderer } from './context';

vi.mock('../primitives/xy_chart/resolve', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../primitives/xy_chart/resolve')>();
  return { ...original, resolveXy: vi.fn(original.resolveXy) };
});

describe('a snapshot render with the pack resolver', () => {
  it.each(['light', 'dark'] as const)(
    'resolves and draws an xyChart once, at its box: %s',
    (theme) => {
      const drawn: Scene[] = [];
      const counting: ReactSceneRenderer = {
        id: 'counting',
        environments: ['node'],
        sized: true,
        supports: (kind) => SCENE_KINDS.includes(kind),
        render: (scene) => {
          drawn.push(scene);
          return null;
        },
      };
      const runtime = createIsomerRuntime({
        packs: [createChartsPack({ sceneRenderers: [counting] })],
        frames: { page: chartsFrame },
      });
      vi.mocked(resolveXy).mockClear();
      runtime.surfaces.snapshot.render(
        { type: 'view', body: [xyTimeSeries] },
        { theme }
      );
      expect(resolveXy).toHaveBeenCalledTimes(1);
      expect(drawn).toHaveLength(1);
      expect(drawn[0]?.size).toBeDefined();
    }
  );
});
