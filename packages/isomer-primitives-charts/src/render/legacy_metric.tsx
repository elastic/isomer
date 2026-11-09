/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A legacy metric Scene as Kibana draws it (`expression_legacy_metric`): no
// chart engine, just a wrapping row of tiles, each a bold value and its label,
// centered in the chart. Every string, color and length is the Scene's.

import type { KeyboardEvent } from 'react';

import { selectEvent } from '../scene/events';
import type {
  LegacyMetricScene,
  LegacyMetricTile,
  SceneRenderEnv,
} from '../scene/types';

import type { ReactSceneRenderer } from './context';
import { legacyMetricModule } from './legacy_metric_styles';
import { cls, px, varStyle } from './styles';

const { handles: legacy, vars } = legacyMetricModule;

const Tile = ({
  scene,
  tile,
  env,
}: {
  scene: LegacyMetricScene;
  tile: LegacyMetricTile;
  env: SceneRenderEnv;
}) => {
  const { selection } = tile;
  const select =
    selection && env.onEvent && env.nodeId !== undefined
      ? () => env.onEvent?.(selectEvent(env.nodeId!, selection))
      : undefined;
  const lineHeight = String(scene.lineHeight);
  return (
    <div
      data-part="tile"
      className={cls(
        env,
        legacy.tile,
        legacy.align[scene.textAlign],
        select && legacy.selectable
      )}
      style={varStyle(vars.tile, {
        fill: tile.background,
        padding: px(tile.type.padding),
      })}
      {...(select
        ? {
            role: 'button',
            tabIndex: 0,
            title: tile.description,
            onClick: select,
            onKeyDown: (event: KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                select();
              }
            },
          }
        : {})}>
      <div
        data-part="value"
        className={cls(env, legacy.text)}
        style={varStyle(vars.text, {
          size: px(tile.type.value),
          color: tile.value.color,
          lineHeight,
          weight: String(scene.valueWeight),
        })}>
        {tile.value.text}
      </div>
      {scene.showLabels ? (
        <div
          data-part="label"
          className={cls(env, legacy.text, legacy.label[scene.labelPosition])}
          style={varStyle(vars.text, {
            size: px(tile.type.label),
            color: tile.labelColor,
            lineHeight,
          })}>
          {tile.label}
        </div>
      ) : null}
    </div>
  );
};

const LegacyMetricView = ({
  scene,
  env,
}: {
  scene: LegacyMetricScene;
  env: SceneRenderEnv;
}) => (
  <div
    role="group"
    aria-label={scene.summary}
    className={cls(env, legacy.root)}
    style={varStyle(vars.box, {
      width: scene.size && px(scene.size.width),
      height: scene.size && px(scene.size.height),
      fill: scene.background,
      ink: scene.empty ? scene.chrome.textSubdued : scene.chrome.text,
    })}>
    {scene.empty ? (
      <span data-part="empty" className={cls(env, legacy.empty)}>
        {scene.empty.text}
      </span>
    ) : (
      scene.tiles.map((tile, index) => (
        <Tile key={index} scene={scene} tile={tile} env={env} />
      ))
    )}
  </div>
);

/**
 * The pack's own renderer for legacy metric Scenes. Kibana draws a legacy
 * metric with no chart engine, so the pack does, the same in the browser and
 * on Node, at the Scene's size.
 */
export const legacyMetricSceneRenderer: ReactSceneRenderer = {
  id: 'charts-legacy-metric',
  environments: ['browser', 'node'],
  sized: true,
  supports: (kind) => kind === 'legacyMetric',
  render: (scene, env) =>
    scene.kind === 'legacyMetric' ? (
      <LegacyMetricView scene={scene} env={env} />
    ) : null,
};
