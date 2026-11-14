/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A tag cloud Scene as Kibana's tag cloud draws it (`expression_tagcloud`:
// `TagCloudChart`), with Elastic Charts' `Wordcloud`. Words, weights and
// colors are the Scene's; Elastic Charts sizes and places them. The label
// under the cloud is this engine's own element, as it is Kibana's.

import type { ReactNode } from 'react';
import { Chart, Settings, Wordcloud } from '@elastic/charts';
import {
  cls,
  px,
  type SceneRenderEnv,
  type TagCloudScene,
  varStyle,
} from '@elastic/isomer-primitives-charts/scene';

import { tagCloudHandlers } from './events';
import type { ElasticChartsOptions } from './options';
import { commonSettings } from './settings';
import { elasticModule } from './styles';

/** The font Kibana's tag cloud sets its words in. */
export const TAG_CLOUD_FONT_FAMILY =
  "'Elastic UI Numeric', 'Inter UI', sans-serif";

/** What each datum this engine passes Elastic Charts carries: one Scene word. */
export interface TagCloudDatum {
  readonly text: string;
  readonly weight: number;
  readonly color: string;
  /** The word's index in the Scene's `words`. */
  readonly index: number;
}

/** The Scene's words as Elastic Charts' word cloud data, each naming its word. */
export const tagCloudData = (scene: TagCloudScene): TagCloudDatum[] =>
  scene.words.map(({ text, weight, color }, index) => ({
    text,
    weight,
    color,
    index,
  }));

/** A tag cloud Scene's spec elements, for `<Chart>` or headless drawing; `null` when it is empty. */
export const tagCloudSpecs = (
  scene: TagCloudScene,
  env: SceneRenderEnv,
  options: ElasticChartsOptions
): ReactNode => {
  if (scene.empty) {
    return null;
  }
  return (
    <>
      <Settings
        {...commonSettings(scene, options)}
        theme={{ background: { color: scene.chrome.background } }}
        {...tagCloudHandlers(scene, env)}
      />
      <Wordcloud
        id="tagCloud"
        startAngle={scene.angles.start}
        endAngle={scene.angles.end}
        angleCount={scene.angles.count}
        padding={5}
        fontWeight={400}
        fontFamily={TAG_CLOUD_FONT_FAMILY}
        fontStyle="normal"
        minFontSize={scene.fontSize.min}
        maxFontSize={scene.fontSize.max}
        spiral="archimedean"
        data={tagCloudData(scene)}
        weightFn={scene.scale}
      />
    </>
  );
};

/** The cloud above its label, in the browser, as Kibana lays them out. */
export const TagCloudChart = ({
  scene,
  env,
  options,
}: {
  scene: TagCloudScene;
  env: SceneRenderEnv;
  options: ElasticChartsOptions;
}) => {
  const chart = <Chart size="100%">{tagCloudSpecs(scene, env, options)}</Chart>;
  const { handles, vars } = elasticModule;
  return (
    <div
      className={cls(env, handles.tagCloud)}
      style={varStyle(vars.tagCloud, {
        width: scene.size && px(scene.size.width),
        height: scene.size && px(scene.size.height),
        ink: scene.chrome.text,
        fill: scene.chrome.background,
      })}>
      <div className={cls(env, handles.tagCloudCloud)}>{chart}</div>
      {scene.label === undefined ? null : (
        <div className={cls(env, handles.tagCloudLabel)}>{scene.label}</div>
      )}
    </div>
  );
};
