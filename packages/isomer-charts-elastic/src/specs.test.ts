/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  metricSingleValueScene,
  type Scene,
  xyInteractiveScene,
} from '@elastic/isomer-primitives-charts/scene';
import { describe, expect, it } from 'vitest';

import { specElements, specIds } from './shared/specs.fixtures';
import { sceneSpecs } from './specs';

describe('sceneSpecs', () => {
  it.each([
    { kind: 'xy', scene: xyInteractiveScene },
    { kind: 'metric', scene: metricSingleValueScene },
  ] as const)(
    '$kind: describes the chart by its summary, then its authored description',
    ({ scene }) => {
      const settings = (described: Scene) =>
        specElements(sceneSpecs(described, { environment: 'browser' })).find(
          (element) => 'ariaDescription' in element
        )?.ariaDescription;
      expect(settings(scene)).toBe(scene.summary);
      expect(settings({ ...scene, description: 'Spikes are deploys.' })).toBe(
        `${scene.summary} Spikes are deploys.`
      );
    }
  );

  it('builds a metric Scene into its grid', () => {
    expect(
      specIds(sceneSpecs(metricSingleValueScene, { environment: 'browser' }))
    ).toContain('metric');
  });
});
