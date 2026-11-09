/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Checks any static drawing with Elastic Charts can pass, against the
// `DebugState` Elastic Charts reports for it: ticks are Elastic Charts' own, so
// only what it says it drew can be compared with the Scene's labels.

import type { DebugState } from '@elastic/charts';
import {
  formatAxisValue,
  type PartitionScene,
  type Scene,
  type SceneAxis,
  type XyScene,
} from '@elastic/isomer-primitives-charts/scene';

import { seriesOf } from './events';
import { slicesOf } from './partition';

/** A drawn tick's expected label: its category's label, or the value through `formatAxisValue`. */
const sceneLabel = (scene: XyScene, axis: SceneAxis, value: unknown) =>
  (axis.scale === 'ordinal'
    ? scene.categories.find(({ x }) => x === value)?.label
    : undefined) ?? formatAxisValue(scene, axis, value as number);

const sorted = (entries: readonly string[]) => [...entries].sort();

const sameList = (
  what: string,
  got: readonly string[],
  expected: readonly string[]
) =>
  JSON.stringify(got) === JSON.stringify(expected)
    ? []
    : [`${what} are ${JSON.stringify(got)}, not ${JSON.stringify(expected)}`];

const xyProblems = (scene: XyScene, state: DebugState): string[] => {
  const ticks = [
    ...(state.axes?.x ?? []).map((axis) => [scene.axes.x, axis] as const),
    ...(state.axes?.y ?? []).map(
      (axis) => [scene.axes[axis.id as 'y' | 'y2'], axis] as const
    ),
  ];
  const problems = ticks.length === 0 ? ['no axis is drawn'] : [];
  for (const [axis, { id, labels, values }] of ticks) {
    if (!axis) {
      problems.push(`axis "${id}" is drawn but is none of the Scene's`);
      continue;
    }
    labels.forEach((label, index) => {
      const expected = sceneLabel(scene, axis, values[index]);
      if (label !== '' && label !== expected) {
        problems.push(
          `axis "${id}" labels ${String(values[index])} "${label}", not "${expected}"`
        );
      }
    });
  }
  const series = seriesOf(scene);
  problems.push(
    ...sameList(
      'series drawn',
      sorted(
        [
          ...(state.bars ?? []),
          ...(state.lines ?? []),
          ...(state.areas ?? []),
        ].map(({ name, color }) => `${name} ${color}`)
      ),
      sorted(series.map(({ label, color }) => `${label} ${color}`))
    )
  );
  if (scene.legend.visible) {
    problems.push(
      ...sameList(
        'legend items',
        (state.legend?.items ?? []).map(
          ({ name, color }) => `${name} ${color}`
        ),
        scene.legend.items.map(({ label, color }) => `${label} ${color}`)
      )
    );
  }
  return problems;
};

const partitionProblems = (
  scene: PartitionScene,
  state: DebugState
): string[] => {
  // Elastic Charts names each slice by its key; a waffle reports each square.
  const drawn = new Map(
    (state.partition?.[0]?.partitions ?? []).map(({ name, color, value }) => [
      name,
      `${color} ${value}`,
    ])
  );
  const slices = slicesOf(scene.nodes);
  return [
    ...(drawn.size === slices.length
      ? []
      : [`${drawn.size} slices drawn, not ${slices.length}`]),
    ...slices.flatMap(({ key, color, value }) =>
      drawn.get(key) === `${color} ${value}`
        ? []
        : [
            `slice "${key}" is ${drawn.get(key) ?? 'not drawn'}, not ${color} ${value}`,
          ]
    ),
  ];
};

/**
 * Where what Elastic Charts reports drawing for `scene` differs from it: an xy
 * chart's tick labels, series and legend items, a partition's slices. A metric
 * has no `DebugState` in Elastic Charts, so it is checked by its text alone.
 */
export const debugStateProblems = (
  scene: Scene,
  state: DebugState | undefined
): string[] => {
  // A metric has no DebugState, and an empty partition draws its note alone.
  if (
    scene.kind === 'metric' ||
    scene.kind === 'table' ||
    (scene.kind === 'partition' && scene.empty)
  ) {
    return [];
  }
  if (!state) {
    return ['Elastic Charts reports no DebugState'];
  }
  switch (scene.kind) {
    case 'xy':
      return xyProblems(scene, state);
    case 'partition':
      return partitionProblems(scene, state);
    default:
      return [`no DebugState check for ${scene.kind} Scenes`];
  }
};

/** What Elastic Charts reports it drew as text: axis titles and tick labels, legend names. */
export const debugStateTexts = (state: DebugState | undefined): string[] => [
  ...[...(state?.axes?.x ?? []), ...(state?.axes?.y ?? [])].flatMap(
    ({ title, labels }) => [...(title ? [title] : []), ...labels]
  ),
  ...(state?.legend?.items ?? []).map(({ name }) => name),
];

/** What Elastic Charts reports it painted: each series' and slice's color. */
export const debugStateColors = (state: DebugState | undefined): string[] => [
  ...[
    ...(state?.bars ?? []),
    ...(state?.lines ?? []),
    ...(state?.areas ?? []),
  ].map(({ color }) => color),
  ...(state?.partition?.[0]?.partitions ?? []).map(({ color }) => color),
];

export { installLookPage } from './look_page';
export {
  type LookDrawing,
  type LookExpect,
  type LookScore,
  type LookSuite,
  type LookTest,
  LOOK_SCALE,
  defineLookSuite,
} from './look_suite';
