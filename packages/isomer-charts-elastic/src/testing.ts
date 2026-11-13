/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Checks any static drawing with Elastic Charts can pass, against the
// `DebugState` Elastic Charts reports for it: ticks are Elastic Charts' own, so
// only what it says it drew can be compared with the Scene's labels.

import type { DebugState, DebugStateAxis } from '@elastic/charts';
import {
  formatAxisValue,
  type GaugeScene,
  type HeatmapScene,
  type PartitionScene,
  type Scene,
  type SceneAxis,
  type SceneTimeBand,
  type SceneTimeLayer,
  type SceneTimeTicks,
  timeTicksAt,
  type XyScene,
} from '@elastic/isomer-primitives-charts/scene';

import { seriesOf } from './events';
import { slicesOf } from './partition';

/** A drawn tick's expected label: its category's label, or the value through `formatAxisValue`. */
const sceneLabel = (scene: XyScene, axis: SceneAxis, value: unknown) =>
  (axis.scale === 'ordinal'
    ? scene.categories.find(({ x }) => x === value)?.label
    : undefined) ?? formatAxisValue(scene, axis, value as number);

/** Gridlines within this many pixels of where a tick falls are at it. */
const GRID_TOLERANCE = 0.5;

/** Elastic Charts' `MIN_LABEL_GAP`, between a time layer's first label and its next tick. */
const MIN_LABEL_GAP = 4;

/** What a drawing measured, beyond what its `DebugState` reports. */
export interface DebugStateOptions {
  /** A tick label's width in pixels, as the drawing measured it. */
  readonly labelWidth?: (label: string) => number;
}

/**
 * The plot width at which `band` puts Elastic Charts' gridlines, and whether it
 * puts every one where it was drawn; `undefined` when no gridline lies past the
 * domain's start to measure by. `DebugState` reports the finest grid layer's
 * ticks within the domain, the first perhaps dropped, from 0 at its start.
 */
const gridMeasure = (
  { domain: { min, max } }: SceneTimeTicks,
  band: SceneTimeBand,
  gridlines: readonly number[]
): { width: number; fits: boolean } | undefined => {
  const at = band.layers
    .find(({ grid, ticks }) => grid && ticks.some((tick) => tick.at >= min))
    ?.ticks.map((tick) => tick.at)
    .filter((value) => value >= min && value <= max);
  const last = at?.at(-1);
  const lastLine = gridlines.at(-1);
  if (
    !at ||
    last === undefined ||
    last <= min ||
    lastLine === undefined ||
    lastLine <= GRID_TOLERANCE
  ) {
    return undefined;
  }
  const width = (lastLine * (max - min)) / (last - min);
  const fits = (values: readonly number[]) =>
    values.length === gridlines.length &&
    values.every(
      (value, index) =>
        Math.abs(((value - min) / (max - min)) * width - gridlines[index]!) <=
        GRID_TOLERANCE
    );
  return { width, fits: fits(at) || fits(at.slice(1)) };
};

const tickKey = (value: unknown, label: string) =>
  `${String(value)} "${label}"`;

/**
 * Which of a labeled layer's ticks Elastic Charts may leave unlabeled: the
 * first where its own label reaches the next tick, the last where its own label
 * runs past the plot. Unmeasured, either may be.
 */
const droppable = (
  ticks: SceneTimeLayer['ticks'],
  { domain: { min, max } }: SceneTimeTicks,
  width: number | undefined,
  { labelWidth }: DebugStateOptions
): ReadonlySet<number> => {
  const last = ticks.length - 1;
  if (width === undefined || labelWidth === undefined) {
    return new Set([0, last]);
  }
  const at = (value: number) =>
    ((Math.max(value, min) - min) / (max - min)) * width;
  const [first, second] = ticks;
  return new Set([
    ...(first &&
    second &&
    at(second.at) - at(first.at) < labelWidth(first.label) + MIN_LABEL_GAP
      ? [0]
      : []),
    ...(at(ticks[last]!.at) + labelWidth(ticks[last]!.label) > width
      ? [last]
      : []),
  ]);
};

/** Where a drawn time axis is not `band`, drawn `width` pixels wide when measured. */
const timeBandProblems = (
  id: string,
  ticks: SceneTimeTicks,
  band: SceneTimeBand,
  width: number | undefined,
  drawn: ReadonlySet<string>,
  options: DebugStateOptions
): string[] => {
  const layers = band.layers.filter(
    (layer) => layer.labeled && layer.ticks.length > 0
  );
  const expected = new Set(
    layers.flatMap((layer) =>
      layer.ticks.map(({ at, label }) => tickKey(at, label))
    )
  );
  return [
    ...[...drawn]
      .filter((key) => !expected.has(key))
      .map((key) => `axis "${id}" labels ${key}, which its band does not`),
    ...layers.flatMap((layer) => {
      const optional = droppable(layer.ticks, ticks, width, options);
      return layer.ticks.flatMap(({ at, label }, index) => {
        const key = tickKey(at, label);
        return optional.has(index) || drawn.has(key)
          ? []
          : [`axis "${id}" leaves out ${key}`];
      });
    }),
  ];
};

/**
 * Where a drawn time axis is not the Scene's band at its plot width, measured
 * from its gridlines; with none past the domain's start to measure by, not any
 * band.
 */
const timeAxisProblems = (
  { timeTicks }: SceneAxis,
  { id, labels, values, gridlines }: DebugStateAxis,
  options: DebugStateOptions
): string[] => {
  if (!timeTicks) {
    return [];
  }
  const drawn = new Set(
    labels.flatMap((label, index) =>
      label === '' ? [] : [tickKey(values[index], label)]
    )
  );
  const lines = gridlines.map(({ x }) => x);
  const measures = timeTicks.bands.map(
    (band) => [band, gridMeasure(timeTicks, band, lines)] as const
  );
  const [band, measure] =
    measures.find(
      ([candidate, at]) =>
        at?.fits && timeTicksAt(timeTicks, at.width) === candidate
    ) ?? [];
  if (band && measure) {
    return timeBandProblems(id, timeTicks, band, measure.width, drawn, options);
  }
  if (
    measures.some(([, at]) => at !== undefined) ||
    lines.some((x) => x > GRID_TOLERANCE)
  ) {
    return [
      `axis "${id}" draws gridlines at ${JSON.stringify(lines)}, which no band of the Scene's puts there`,
    ];
  }
  return timeTicks.bands.some(
    (candidate) =>
      timeBandProblems(id, timeTicks, candidate, undefined, drawn, options)
        .length === 0
  )
    ? []
    : [
        `axis "${id}" labels ${JSON.stringify([...drawn])}, which are no band of the Scene's`,
      ];
};

const sorted = (entries: readonly string[]) => [...entries].sort();

const sameList = (
  what: string,
  got: readonly string[],
  expected: readonly string[]
) =>
  JSON.stringify(got) === JSON.stringify(expected)
    ? []
    : [`${what} are ${JSON.stringify(got)}, not ${JSON.stringify(expected)}`];

const xyProblems = (
  scene: XyScene,
  state: DebugState,
  options: DebugStateOptions
): string[] => {
  const ticks = [
    ...(state.axes?.x ?? []).map((axis) => [scene.axes.x, axis] as const),
    ...(state.axes?.y ?? []).map(
      (axis) => [scene.axes[axis.id as 'y' | 'y2'], axis] as const
    ),
  ];
  const problems = ticks.length === 0 ? ['no axis is drawn'] : [];
  for (const [axis, drawn] of ticks) {
    const { id, labels, values } = drawn;
    if (!axis) {
      problems.push(`axis "${id}" is drawn but is none of the Scene's`);
      continue;
    }
    if (axis.timeTicks) {
      problems.push(...timeAxisProblems(axis, drawn, options));
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

/** A `#rrggbb[aa]` or `rgb[a](…)` color's channels, as `r,g,b`. */
const rgbOf = (color: string): string => {
  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(color);
  if (hex) {
    return hex
      .slice(1, 4)
      .map((channel) => parseInt(channel, 16))
      .join(',');
  }
  return (color.match(/\d+(?:\.\d+)?/g) ?? [])
    .slice(0, 3)
    .map((channel) => String(Math.round(Number(channel))))
    .join(',');
};

const heatmapProblems = (scene: HeatmapScene, state: DebugState): string[] => {
  const cells = state.heatmap?.cells ?? [];
  const problems =
    cells.length === scene.cells.length
      ? []
      : [`${cells.length} cells drawn, not ${scene.cells.length}`];
  for (const drawn of cells) {
    const { datum, fill, formatted } = drawn;
    // Reported though `CellDebug` does not declare it; a label that does not fit is hidden.
    const { valueShown } = drawn as { valueShown?: boolean };
    const index = (datum as { originalIndex: number }).originalIndex;
    const cell = scene.cells[index];
    if (!cell) {
      problems.push(`cell ${index} is drawn but is none of the Scene's`);
      continue;
    }
    // A cell in no band is transparent, whatever channels it names.
    const clear = /^#[\da-f]{6}00$/i.test(cell.color);
    if (clear ? !fill.endsWith(', 0)') : rgbOf(fill) !== rgbOf(cell.color)) {
      problems.push(`cell ${index} is filled ${fill}, not ${cell.color}`);
    }
    if (formatted !== '' && formatted !== cell.valueText) {
      problems.push(
        `cell ${index} reads "${formatted}", not "${cell.valueText}"`
      );
    }
    if (valueShown && !scene.cellLabels) {
      problems.push(`cell ${index} shows its value with no \`cellLabels\``);
    }
  }
  const [xAxis] = state.axes?.x ?? [];
  const [yAxis] = state.axes?.y ?? [];
  const xLabels =
    scene.x.scale === 'time'
      ? (xAxis?.values ?? []).map((value) =>
          formatAxisValue(scene, scene.x, value as number)
        )
      : scene.x.categories.map(({ label }) => label);
  problems.push(
    ...sameList('x labels', xAxis?.labels ?? [], xLabels),
    ...sameList(
      'y labels',
      yAxis?.labels ?? [],
      scene.y.categories.map(({ label }) => label)
    ),
    ...sameList(
      'axis titles',
      [xAxis?.title ?? '', yAxis?.title ?? ''],
      [scene.x.title ?? '', scene.y.title ?? '']
    )
  );
  if (scene.legend.visible) {
    problems.push(
      ...sameList(
        'legend items',
        (state.legend?.items ?? []).map(
          ({ name, color }) => `${name} ${color}`
        ),
        scene.bands.map(({ label, color }) => `${label} ${color}`)
      )
    );
  }
  return problems;
};

const gaugeProblems = (scene: GaugeScene, state: DebugState): string[] => {
  const [drawn] = state.bullet?.rows?.[0] ?? [];
  if (!drawn) {
    return ['no bullet is drawn'];
  }
  const colors = (drawn.colorBands ?? []).map((color) => color.toUpperCase());
  return [
    ...sameList(
      'bullet',
      [
        drawn.title,
        drawn.subtitle ?? '',
        String(drawn.value),
        String(drawn.target ?? ''),
        drawn.domain.join(' to '),
      ],
      [
        scene.labels.major,
        scene.labels.minor ?? '',
        String(scene.value),
        String(scene.goal?.value ?? ''),
        `${scene.min} to ${scene.max}`,
      ]
    ),
    // A lone band is passed as its color twice.
    ...sameList(
      'bands',
      scene.bands.length === 1 ? [...new Set(colors)] : colors,
      scene.bands.map(({ color }) => color.toUpperCase())
    ),
    ...(scene.ticks
      ? sameList(
          'ticks',
          (drawn.ticks ?? []).map(String),
          scene.ticks.map(String)
        )
      : []),
  ];
};

/**
 * Where what Elastic Charts reports drawing for `scene` differs from it: an xy
 * chart's tick labels, series and legend items, a partition's slices, a heat
 * map's cells, positions and bands, a gauge's bullet. A metric or tag cloud
 * has no `DebugState` in Elastic Charts, so it is checked by its text alone.
 * Given {@link DebugStateOptions.labelWidth}, a time axis's edge labels are
 * held to Elastic Charts' rules for leaving them out.
 */
export const debugStateProblems = (
  scene: Scene,
  state: DebugState | undefined,
  options: DebugStateOptions = {}
): string[] => {
  // A metric or tag cloud has no DebugState, and an empty chart draws its note alone.
  if (
    scene.kind === 'metric' ||
    scene.kind === 'tagCloud' ||
    scene.kind === 'table' ||
    ((scene.kind === 'partition' ||
      scene.kind === 'heatmap' ||
      scene.kind === 'gauge') &&
      scene.empty)
  ) {
    return [];
  }
  if (!state) {
    return ['Elastic Charts reports no DebugState'];
  }
  const { kind } = scene;
  switch (scene.kind) {
    case 'xy':
      return xyProblems(scene, state, options);
    case 'partition':
      return partitionProblems(scene, state);
    case 'heatmap':
      return heatmapProblems(scene, state);
    case 'gauge':
      return gaugeProblems(scene, state);
    default:
      return [`no DebugState check for ${kind} Scenes`];
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
