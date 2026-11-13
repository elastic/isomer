/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A gauge Scene as Kibana's gauge draws it (`expression_gauge`:
// `GaugeComponent`), with Elastic Charts' `Bullet`. The scale, its colored
// stretches, ticks and every string are the Scene's.

import type { ReactNode } from 'react';
import {
  Bullet,
  type BulletProps,
  BulletSubtype,
  Settings,
} from '@elastic/charts';
import {
  formatAxisValue,
  type GaugeScene,
  type SceneRenderEnv,
} from '@elastic/isomer-primitives-charts/scene';

import { ariaDescriptionOf } from './accessibility';
import type { ElasticChartsOptions } from './options';
import { kibanaBaseTheme } from './theme';

/** Kibana's `getSubtypeByGaugeType`. */
const SUBTYPE = {
  horizontalBullet: BulletSubtype.horizontal,
  verticalBullet: BulletSubtype.vertical,
  semiCircle: BulletSubtype.halfCircle,
  arc: BulletSubtype.twoThirdsCircle,
  circle: BulletSubtype.circle,
} as const;

/**
 * The Scene's bands as Elastic Charts' color bands: their edges as `steps`,
 * one color each, as Kibana passes them. A lone band goes as its color twice,
 * as Kibana passes an uncolored scale, so Elastic Charts draws it in that one
 * color rather than blending a second.
 */
export const gaugeColorBands = (
  scene: GaugeScene
): NonNullable<BulletProps['colorBands']> => {
  const { bands } = scene;
  if (bands.length === 1) {
    return [bands[0]!.color, bands[0]!.color];
  }
  return {
    steps: [bands[0]!.start, ...bands.map(({ end }) => end)],
    colors: bands.map(({ color }) => color),
  };
};

/** The text Elastic Charts writes for the value: the Scene's, else `formatAxisValue`. */
export const gaugeValueFormatter =
  (scene: GaugeScene) =>
  (value: number): string =>
    value === scene.value
      ? scene.valueText
      : formatAxisValue(scene, scene, value);

/** The text Elastic Charts writes for the goal: the Scene's, else `formatAxisValue`. */
export const gaugeTargetFormatter =
  (scene: GaugeScene) =>
  (value: number): string =>
    value === scene.goal?.value
      ? scene.goal.text
      : formatAxisValue(scene, scene, value);

/** A gauge Scene's spec elements, for `<Chart>` or headless drawing; `null` when it is empty. */
export const gaugeSpecs = (
  scene: GaugeScene,
  _env: SceneRenderEnv,
  options: ElasticChartsOptions
): ReactNode => {
  if (scene.empty || scene.value === undefined) {
    return null;
  }
  const tick = (value: number) => formatAxisValue(scene, scene, value);
  const { ticks } = scene;
  return (
    <>
      <Settings
        baseTheme={kibanaBaseTheme(scene.scheme)}
        theme={{ background: { color: scene.chrome.background } }}
        locale={scene.locale}
        debugState={options.debugState ?? false}
        {...(scene.title === undefined ? {} : { ariaLabel: scene.title })}
        ariaDescription={ariaDescriptionOf(scene)}
      />
      <Bullet
        id="gauge"
        subtype={SUBTYPE[scene.shape]}
        colorBands={gaugeColorBands(scene)}
        valueLabels={{
          active: scene.tooltipLabels.active,
          value: scene.tooltipLabels.value,
          target: scene.tooltipLabels.goal,
        }}
        data={[
          [
            {
              value: scene.value,
              ...(scene.goal ? { target: scene.goal.value } : {}),
              title: scene.labels.major,
              ...(scene.labels.minor === undefined
                ? {}
                : { subtitle: scene.labels.minor }),
              domain: [scene.min, scene.max],
              ...(ticks ? { ticks: () => [...ticks] } : {}),
              valueFormatter: gaugeValueFormatter(scene),
              targetFormatter: gaugeTargetFormatter(scene),
              tickFormatter: tick,
            },
          ],
        ]}
      />
    </>
  );
};
