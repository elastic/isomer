/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { type ChartEvent, chartEventSchema } from '../schema/events';
import { chartEventExamples } from '../schema/examples/events';
import { xyInteractive } from '../schema/examples/xy_chart';

import { brushEvent, selectEvent } from './events';
import { xyInteractiveScene, xyTimeSeriesScene } from './examples';
import type { SceneSelection } from './types';

const NODE = xyInteractive.id ?? '';
const HOUR = 3_600_000;
const START = Date.UTC(2026, 10, 3);

const seriesOf = (key: string) => {
  const series = xyInteractiveScene.layers
    .flatMap((layer) => (layer.kind === 'series' ? [layer.series] : []))
    .find((entry) => entry.key === key);
  if (!series) {
    throw new Error(`no series ${key}`);
  }
  return series;
};

/** The gesture each example describes, against the hand-written Scene. */
const gestures: Record<string, () => ChartEvent | undefined> = {
  'Select a bar segment': () =>
    selectEvent(NODE, seriesOf('404').marks[0]!.selection!),
  'Select the missing bucket': () =>
    selectEvent(NODE, seriesOf('\\null').marks[0]!.selection!),
  'Filter out a legend item': () =>
    selectEvent(
      NODE,
      xyInteractiveScene.legend.items.find(({ key }) => key === 'Other')!
        .selection!,
      true
    ),
  'Select an x category': () =>
    selectEvent(NODE, xyInteractiveScene.categories[1]!.selection!),
  'Brush a time range': () =>
    brushEvent(xyInteractiveScene, NODE, [START, START + 2 * HOUR]),
};

describe('Scene events', () => {
  it.each(chartEventExamples)('$name', ({ name, event }) => {
    const raised = gestures[name]?.();
    expect(raised).toEqual(event);
    expect(chartEventSchema.parse(raised)).toEqual(event);
  });

  it('orders a brush range dragged right to left', () => {
    expect(
      brushEvent(xyInteractiveScene, NODE, [START + 2 * HOUR, START])?.range
    ).toEqual([START, START + 2 * HOUR]);
  });

  it('describes brush ends by their nearest category', () => {
    expect(
      brushEvent(xyInteractiveScene, NODE, [
        START + 0.4 * HOUR,
        START + 1.6 * HOUR,
      ])?.description
    ).toBe('@timestamp per hour: 00:00 to 02:00');
  });

  it('falls back to the brush column label when there is no table data', () => {
    expect(
      brushEvent(
        {
          ...xyInteractiveScene,
          table: { ...xyInteractiveScene.table, rows: [] },
        },
        NODE,
        [START, START + HOUR]
      )?.description
    ).toBe('@timestamp per hour');
  });

  it('raises no brush where the node offers none', () => {
    expect(brushEvent(xyTimeSeriesScene, NODE, [START, START + HOUR])).toBe(
      undefined
    );
  });

  it('copies the selection, so a host cannot change the Scene', () => {
    const selection = xyInteractiveScene.categories[0]!.selection!;
    const event = selectEvent(NODE, selection);
    event.rows.push(99);
    expect(selection.rows).not.toContain(99);
  });

  it('copies multivalue cells in selection values', () => {
    const selection: SceneSelection = {
      target: 'category',
      rows: [0],
      columns: ['tags'],
      values: { tags: ['red', 'blue'] },
      description: 'tags',
    };
    const event = selectEvent(NODE, selection);
    const tags = event.values.tags;
    if (!Array.isArray(tags)) {
      throw new Error('Expected a multivalue cell.');
    }

    tags.push('green');
    expect(selection.values.tags).toEqual(['red', 'blue']);
  });
});
