/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Children, isValidElement, type ReactNode } from 'react';
import {
  metricSingleValueScene,
  xyInteractiveScene,
  type XyScene,
} from '@elastic/isomer-primitives-charts/scene';
import { describe, expect, it } from 'vitest';

import { seriesOf } from './events';
import { sceneSpecs } from './specs';

/** The `id` of every spec element, in the order `sceneSpecs` returns them. */
const specIds = (specs: ReactNode): string[] => {
  const fragment = specs as { props: { children: ReactNode } };
  return Children.toArray(fragment.props.children).flatMap((child) =>
    isValidElement<{ id?: string }>(child) && child.props.id !== undefined
      ? [child.props.id]
      : []
  );
};

describe('sceneSpecs', () => {
  it('draws xy layers in the Scene order, each kind keeping its own index', () => {
    const [first, second, third] = seriesOf(xyInteractiveScene);
    const scene: XyScene = {
      ...xyInteractiveScene,
      layers: [
        { kind: 'series', series: first! },
        {
          kind: 'referenceLine',
          line: {
            axis: 'y',
            value: 100,
            color: '#ff0000',
            strokeWidth: 1,
            strokeDash: 'solid',
            textPosition: 'auto',
          },
        },
        { kind: 'series', series: second! },
        {
          kind: 'annotation',
          annotation: {
            kind: 'point',
            at: 0,
            color: '#00ff00',
            tooltip: { entries: [] },
          },
        },
        { kind: 'series', series: third! },
      ],
    };
    expect(
      specIds(sceneSpecs(scene, { environment: 'browser' })).filter((id) =>
        /^(series|reference|annotation)-/.test(id)
      )
    ).toEqual([
      'series-0',
      'reference-0',
      'series-1',
      'annotation-0',
      'series-2',
    ]);
  });

  it('builds a metric Scene into its grid', () => {
    expect(
      specIds(sceneSpecs(metricSingleValueScene, { environment: 'browser' }))
    ).toContain('metric');
  });
});
