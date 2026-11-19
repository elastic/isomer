/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type MetricScene,
  metricSingleValueScene,
} from '@elastic/isomer-primitives-charts/scene';
import { describe, expect, it } from 'vitest';

import { listen, NODE } from '../../shared/events.fixtures';

import { metricHandlers } from './events';

describe('metric events from Elastic Charts callbacks', () => {
  // Three tiles in rows of two, each selectable by its breakdown value.
  const hosts = ['web-01', 'web-02', 'web-03'];
  const tile = metricSingleValueScene.tiles[0]!;
  const scene: MetricScene = {
    ...metricSingleValueScene,
    interactions: { ...metricSingleValueScene.interactions, select: ['tile'] },
    layout: { ...metricSingleValueScene.layout, columns: 2, rows: 2 },
    tiles: hosts.map((host, row) => ({
      ...tile,
      title: host,
      source: { rows: [row], columns: ['host', 'count'] },
      selection: {
        target: 'tile',
        rows: [row],
        columns: ['host'],
        values: { host },
        description: `host.name: ${host}`,
      },
    })),
  };

  it('maps a grid cell to its tile, row by row', () => {
    const { events, env } = listen();
    metricHandlers(scene, env).onElementClick?.([
      { type: 'metricElementEvent', rowIndex: 1, columnIndex: 0 },
    ]);
    expect(events).toEqual([
      {
        kind: 'select',
        node: NODE,
        target: 'tile',
        rows: [2],
        columns: ['host'],
        values: { host: 'web-03' },
        description: 'host.name: web-03',
      },
    ]);
  });

  it('offers nothing where tiles are not selectable', () => {
    const { env } = listen();
    expect(metricHandlers(metricSingleValueScene, env)).toEqual({});
  });
});
