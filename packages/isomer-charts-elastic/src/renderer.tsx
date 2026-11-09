/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ReactNode, useId } from 'react';
import { Chart } from '@elastic/charts';
import {
  cls,
  px,
  type Scene,
  type SceneKind,
  type SceneRenderEnv,
  type SceneRenderer,
  varStyle,
} from '@elastic/isomer-primitives-charts/scene';

import { emptyTextOf } from './empty';
import type { ElasticChartsOptions } from './options';
import { sceneSpecs } from './specs';
import { elasticModule } from './styles';
import { TagCloudChart } from './tag_cloud';

/** The Elastic Charts release this engine is built and tested against: Kibana's pin. */
export const ELASTIC_CHARTS_VERSION = '73.3.2';

const KINDS: readonly SceneKind[] = [
  'metric',
  'xy',
  'partition',
  'heatmap',
  'gauge',
  'tagCloud',
];

/** Kibana's functional tests turn on `DebugState` through this global. */
const debugFlag = (): boolean =>
  (globalThis as { _echDebugStateFlag?: boolean })._echDebugStateFlag ?? false;

/**
 * A Scene with nothing to draw, as its note. A title names the image, and the
 * note, which says why it is empty, describes it.
 */
const EmptyChart = ({
  scene,
  text,
  env,
}: {
  scene: Scene;
  text: string;
  env: SceneRenderEnv;
}) => {
  const id = useId();
  const { size, chrome } = scene;
  return (
    <div
      role="img"
      aria-label={scene.title ?? text}
      {...(scene.title === undefined ? {} : { 'aria-describedby': id })}
      className={cls(env, elasticModule.handles.empty)}
      style={varStyle(elasticModule.vars.empty, {
        width: size && px(size.width),
        height: size && px(size.height),
        ink: chrome.textSubdued,
        fill: chrome.background,
      })}>
      <span id={id}>{text}</span>
    </div>
  );
};

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
      return <EmptyChart scene={scene} text={empty} env={env} />;
    }
    if (scene.kind === 'tagCloud') {
      return <TagCloudChart scene={scene} env={env} options={resolved} />;
    }
    return (
      <Chart size={scene.size ?? { width: '100%', height: '100%' }}>
        {sceneSpecs(scene, env, resolved)}
      </Chart>
    );
  },
});
