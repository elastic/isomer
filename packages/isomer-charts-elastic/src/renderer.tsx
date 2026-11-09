/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { Chart } from '@elastic/charts';
import type {
  Scene,
  SceneKind,
  SceneRenderer,
} from '@elastic/isomer-primitives-charts/scene';

import { EMPTY_TEXT_SIZE, emptyTextOf } from './empty';
import type { ElasticChartsOptions } from './options';
import { sceneSpecs } from './specs';

/** The Elastic Charts release this engine is built and tested against: Kibana's pin. */
export const ELASTIC_CHARTS_VERSION = '73.3.2';

const KINDS: readonly SceneKind[] = ['metric', 'xy', 'partition'];

/** Kibana's functional tests turn on `DebugState` through this global. */
const debugFlag = (): boolean =>
  (globalThis as { _echDebugStateFlag?: boolean })._echDebugStateFlag ?? false;

/**
 * A `SceneRenderer` drawing Scenes with Elastic Charts, in the browser. The
 * page needs Elastic Charts' stylesheet for the Scene's scheme
 * (`@elastic/charts/dist/theme_light.css` or `theme_dark.css`); Kibana loads it.
 */
export const createElasticChartsRenderer = (
  options: ElasticChartsOptions = {}
): SceneRenderer<ReactNode> => ({
  id: 'elastic-charts',
  environments: ['browser'],
  fluid: true,
  supports: (kind) => KINDS.includes(kind),
  render: (scene: Scene, env) => {
    const resolved = { debugState: options.debugState ?? debugFlag() };
    const empty = emptyTextOf(scene);
    if (empty !== undefined) {
      return (
        <div
          role="img"
          aria-label={scene.title ?? empty}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: scene.size?.width ?? '100%',
            height: scene.size?.height ?? '100%',
            color: scene.chrome.textSubdued,
            background: scene.chrome.background,
            fontSize: EMPTY_TEXT_SIZE,
          }}>
          {empty}
        </div>
      );
    }
    return (
      <Chart size={scene.size ?? { width: '100%', height: '100%' }}>
        {sceneSpecs(scene, env, resolved)}
      </Chart>
    );
  },
});
