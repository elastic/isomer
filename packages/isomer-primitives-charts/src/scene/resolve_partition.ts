/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A partition node as Lens's partition visualization draws it
// (`expression_partition_vis`: `getLayers`, `getColor`, `sortPredicate` and
// the legend utils), with every slice's value, order, name and color decided
// here, so an engine only lays the tree out.

import type { PortableFormat } from '../schema/format';
import type { PartitionChartNode } from '../schema/partition_chart';

import {
  createResolution,
  describe,
  keyPart,
  type ResolveChartOptions,
  resolveInteractions,
  sceneBase,
  titled,
  toNumber,
} from './common';
import { categoricalColor, mixLch, resolveColor, TRANSPARENT } from './theme';
import type {
  PartitionLayer,
  PartitionLegendItem,
  PartitionNode,
  PartitionScene,
  SceneColor,
  SceneSelection,
  SceneTooltipEntry,
} from './types';

const DEFAULTS = {
  donutHole: 0.3,
  percentDecimals: 2,
  categories: 'auto',
  values: 'percent',
} as const;

/** Lens's text for a partition chart with nothing to draw. */
const NO_RESULTS = 'No results found';

/** The metric layer's name, for descriptions. */
const METRIC_LAYER = 'Metric';

// Lens lightens each inner layer toward the background by a fifth more, at most four fifths.
const lighten = (depth: number) => Math.min(0.2 * (depth - 1), 0.8);

interface Draft {
  /** The cell's identity, as grouping matches it: a date by its instant. */
  readonly identity: string;
  readonly part: string;
  readonly label: string;
  readonly depth: number;
  readonly metric?: string;
  readonly rows: number[];
  /** Where this slice first shows in row-then-metric order. */
  readonly first: number;
  /** A leaf's own sum; 0 on an inner slice. */
  own: number;
  /** `own` times {@link SCALE}, so a sum past `Number.MAX_VALUE` still has shares. */
  scaled: number;
  readonly children: Map<string, Draft>;
}

/**
 * A power of two small enough that no table's sum, scaled by it, overflows:
 * every value is at most `Number.MAX_VALUE`, about 2^1024. Exact, since it
 * only shifts the exponent.
 */
const SCALE = 2 ** -1000;

const draft = (
  identity: string,
  part: string,
  label: string,
  depth: number,
  first: number,
  metric?: string
): Draft => ({
  identity,
  part,
  label,
  depth,
  ...(metric === undefined ? {} : { metric }),
  rows: [],
  first,
  own: 0,
  scaled: 0,
  children: new Map(),
});

/** The Scene of a `partitionChart` node. */
export const resolvePartition = (
  node: PartitionChartNode,
  options: ResolveChartOptions
): PartitionScene => {
  const resolution = createResolution(node.data, options);
  const { chrome, data, scheme } = resolution;
  const { shape } = node;
  const groups = (node.groups ?? []).map(({ column }) => column);
  const metrics = node.metrics.map(({ column }) => column);
  const metricLayer = metrics.length > 1 || groups.length === 0;
  const interactions = resolveInteractions(node);
  const selectable = interactions.select.includes('slice');
  const categories = node.labels?.categories ?? DEFAULTS.categories;
  const values =
    categories === 'hidden'
      ? 'hidden'
      : (node.labels?.values ?? DEFAULTS.values);
  const percentFormat: PortableFormat = {
    kind: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits:
      node.labels?.percentDecimals ?? DEFAULTS.percentDecimals,
  };

  const layers: PartitionLayer[] = [
    ...groups.map((column) => ({
      column,
      label: resolution.column(column).label,
    })),
    ...(metricLayer ? [{ label: METRIC_LAYER }] : []),
  ];
  const metricLabels = metrics.map((id) => resolution.column(id).label);

  // Group rows into slices, outermost first, in the order they first show.
  const root = draft('', '', '', 0, 0);
  let negative = false;
  let order = 0;
  data.rows.forEach((_, row) => {
    metrics.forEach((metric) => {
      const value = toNumber(resolution.cell(metric, row)) ?? 0;
      negative ||= value < 0;
      let parent = root;
      const path: { identity: string; make: () => Draft }[] = [
        ...groups.map((column, index) => ({
          identity: resolution.identity(column, row),
          make: () =>
            draft(
              resolution.identity(column, row),
              keyPart(resolution.cell(column, row)),
              resolution.text(column, row),
              index + 1,
              order
            ),
        })),
        ...(metricLayer
          ? [
              {
                identity: metric,
                make: () =>
                  draft(
                    metric,
                    keyPart(metric),
                    resolution.column(metric).label,
                    groups.length + 1,
                    order,
                    metric
                  ),
              },
            ]
          : []),
      ];
      for (const { identity, make } of path) {
        let child = parent.children.get(identity);
        if (!child) {
          child = make();
          parent.children.set(identity, child);
        }
        // Rows arrive in order, so a slice holds this row only if it was last.
        if (child.rows.at(-1) !== row) {
          child.rows.push(row);
        }
        parent = child;
      }
      parent.own += Math.max(0, value);
      parent.scaled += Math.max(0, value) * SCALE;
      order += 1;
    });
  });

  // Draw order within a layer, as Lens sorts: a mosaic's columns, and a lone
  // mosaic layer, keep row order; the metric layer keeps metric order; every
  // other layer runs largest first, ties in row order.
  const sumsOf = new Map<Draft, number>();
  const sumOf = (slice: Draft): number => {
    let sum = sumsOf.get(slice);
    if (sum === undefined) {
      sum =
        slice.children.size === 0
          ? slice.own
          : [...slice.children.values()].reduce(
              (total, child) => total + sumOf(child),
              0
            );
      sumsOf.set(slice, sum);
    }
    return sum;
  };
  const metricRank = new Map(metrics.map((metric, rank) => [metric, rank]));
  const sorted = (slices: Iterable<Draft>): Draft[] =>
    [...slices].sort((a, b) => {
      if (a.metric !== undefined && b.metric !== undefined) {
        return metricRank.get(a.metric)! - metricRank.get(b.metric)!;
      }
      if (shape === 'mosaic' && (a.depth === 1 || groups.length === 1)) {
        return a.first - b.first;
      }
      return sumOf(b) - sumOf(a) || a.first - b.first;
    });

  // Leaves in draw order, depth first: what an engine sums, in this order.
  const leaves: Draft[] = [];
  const collect = (slices: Iterable<Draft>) => {
    for (const slice of sorted(slices)) {
      if (slice.children.size === 0) {
        leaves.push(slice);
      } else {
        collect(slice.children.values());
      }
    }
  };
  collect(root.children.values());
  const total = leaves.reduce((sum, leaf) => sum + leaf.own, 0);
  const scaledTotal = leaves.reduce((sum, leaf) => sum + leaf.scaled, 0);
  // Each slice's sum, adding its leaves in draw order as `total` does.
  const sums = new Map<Draft, { own: number; scaled: number }>();
  const addLeaves = (slice: Draft, ancestors: readonly Draft[]) => {
    if (slice.children.size === 0) {
      for (const each of [...ancestors, slice]) {
        const sum = sums.get(each) ?? { own: 0, scaled: 0 };
        sums.set(each, {
          own: sum.own + slice.own,
          scaled: sum.scaled + slice.scaled,
        });
      }
      return;
    }
    for (const child of sorted(slice.children.values())) {
      addLeaves(child, [...ancestors, slice]);
    }
  };
  for (const slice of sorted(root.children.values())) {
    addLeaves(slice, []);
  }
  const empty = negative
    ? {
        reason: 'negative' as const,
        text: `${shape.charAt(0).toUpperCase()}${shape.slice(1)} chart can't render with negative values.`,
      }
    : total <= 0
      ? { reason: 'noResults' as const, text: NO_RESULTS }
      : undefined;

  // The layer colors are picked by: the second on a two-layer mosaic, else the first.
  const colorDepth = shape === 'mosaic' && groups.length === 2 ? 2 : 1;
  const ranks = new Map<string, number>();
  // Rank by where each category first shows across the whole table, and
  // take its stated color from the first of its key parts that has one.
  const firstShown = new Map<string, number>();
  const parts = new Map<string, { part: string; first: number }[]>();
  const visit = (slices: Iterable<Draft>) => {
    for (const slice of slices) {
      if (slice.depth === colorDepth) {
        firstShown.set(
          slice.identity,
          Math.min(firstShown.get(slice.identity) ?? Infinity, slice.first)
        );
        const written = parts.get(slice.identity) ?? [];
        written.push({ part: slice.part, first: slice.first });
        parts.set(slice.identity, written);
      } else {
        visit(slice.children.values());
      }
    }
  };
  visit(root.children.values());
  [...firstShown]
    .sort(([, a], [, b]) => a - b)
    .forEach(([identity], rank) => ranks.set(identity, rank));

  const colors = node.colors?.byKey;
  const statedColors = new Map(
    [...parts].map(([identity, written]) => [
      identity,
      written
        .sort((a, b) => a.first - b.first)
        .find(({ part }) => colors && Object.hasOwn(colors, part))?.part,
    ])
  );
  // A stated color names a key part; the category takes it in every column.
  const categoryColor = ({ part, identity }: Draft): SceneColor => {
    const named = statedColors.get(identity) ?? part;
    const stated =
      colors && Object.hasOwn(colors, named) ? colors[named] : undefined;
    return stated
      ? resolveColor(stated, scheme)
      : categoricalColor(ranks.get(identity) ?? 0);
  };
  const colorOf = (path: readonly Draft[]): SceneColor => {
    const slice = path[path.length - 1]!;
    if (colorDepth === 2) {
      return slice.depth === 1 ? TRANSPARENT : categoryColor(slice);
    }
    const base = categoryColor(path[0]!);
    return layers.length > 1
      ? mixLch(base, chrome.background, lighten(slice.depth))
      : base;
  };

  const resolveSlice = (
    slice: Draft,
    ancestors: readonly PartitionNode[],
    path: readonly Draft[]
  ): PartitionNode => {
    const own = [...path, slice];
    const sum = sums.get(slice) ?? { own: 0, scaled: 0 };
    const value = Math.min(sum.own, Number.MAX_VALUE);
    const metric = slice.metric ?? metrics[0]!;
    const [onlyRow] = slice.rows;
    const display =
      slice.rows.length === 1 &&
      onlyRow !== undefined &&
      (metrics.length === 1 || slice.metric !== undefined)
        ? data.display?.[metric]?.[onlyRow]
        : undefined;
    const valueText = display ?? resolution.valueText(metric, value);
    // Past `Number.MAX_VALUE` the sums are infinite; their scaled sums are not.
    const share = !(total > 0)
      ? 0
      : Number.isFinite(total)
        ? value / total
        : sum.scaled / scaledTotal;
    const percentText = resolution.formatAs(share, percentFormat);
    const groupPath = own.filter(({ metric: part }) => part === undefined);
    const columns = groups.slice(0, groupPath.length);
    const description = describe([
      ...groupPath.map(
        ({ label }, index) => [layers[index]!.label, label] as const
      ),
      [
        slice.metric === undefined
          ? metricLabels.join(' + ')
          : resolution.column(slice.metric).label,
        valueText,
      ] as const,
    ]);
    const first = slice.rows[0]!;
    const selection: SceneSelection | undefined = selectable
      ? {
          target: 'slice',
          rows: [...slice.rows],
          columns,
          values: Object.fromEntries(
            columns.map((column) => [column, resolution.cell(column, first)])
          ),
          description,
        }
      : undefined;
    const color = colorOf(own);
    const entry: SceneTooltipEntry = {
      label: slice.label,
      value: `${valueText}\u00A0(${percentText})`,
      color,
    };
    const resolved: PartitionNode = {
      key: own.map(({ part }) => part).join(':'),
      label: slice.label,
      depth: slice.depth,
      ...(slice.metric === undefined ? {} : { metric: slice.metric }),
      value,
      valueText,
      share,
      percentText,
      valueLabel:
        values === 'percent'
          ? percentText
          : values === 'value'
            ? valueText
            : '',
      color,
      source: {
        rows: [...slice.rows],
        columns: [
          ...columns,
          ...(slice.metric === undefined ? metrics : [slice.metric]),
        ],
      },
      tooltip: {
        entries: [
          ...ancestors.map(
            (ancestor) => ancestor.tooltip.entries[ancestor.depth - 1]!
          ),
          entry,
        ],
      },
      description,
      ...(selection ? { selection } : {}),
      children: [],
    };
    return {
      ...resolved,
      children: sorted(slice.children.values()).map((child) =>
        resolveSlice(child, [...ancestors, resolved], own)
      ),
    };
  };

  const nodes = empty
    ? []
    : sorted(root.children.values()).map((slice) =>
        resolveSlice(slice, [], [])
      );

  const legendConfig = node.legend;
  const visibility = legendConfig?.visibility ?? 'auto';
  const nested =
    (legendConfig?.nested ?? false) && shape !== 'waffle' && layers.length > 1;
  const showValues = legendConfig?.values ?? shape === 'waffle';
  const flatten = (slices: readonly PartitionNode[]): PartitionNode[] =>
    slices.flatMap((slice) => [slice, ...flatten(slice.children)]);
  const legendNodes = nested
    ? flatten(nodes)
    : [...nodes].sort((a, b) => a.source.rows[0]! - b.source.rows[0]!);
  const items: PartitionLegendItem[] = legendNodes.map((slice) => ({
    key: slice.key,
    label: slice.label,
    color: slice.color,
    depth: slice.depth,
    ...(showValues ? { value: slice.valueText } : {}),
    description: slice.description,
    ...(slice.selection ? { selection: slice.selection } : {}),
  }));

  const measured = metricLabels.join(' and ');
  const sentence =
    empty?.reason === 'negative'
      ? `${measured} has negative values, which a ${shape} chart cannot show.`
      : empty
        ? `${measured} has no data.`
        : `${measured}${
            groups.length
              ? ` by ${layers
                  .filter(({ column }) => column !== undefined)
                  .map(({ label }) => label)
                  .join(' and ')}`
              : ''
          }: ${nodes
            .map(({ label, percentText }) => `${label} ${percentText}`)
            .join(', ')}.`;

  return {
    kind: 'partition',
    ...sceneBase(resolution, node),
    summary: titled(node.title, sentence),
    interactions,
    shape,
    layers,
    nodes,
    total: empty ? 0 : Math.min(total, Number.MAX_VALUE),
    labels: { categories, values },
    donutHole: shape === 'donut' ? (node.donutHole ?? DEFAULTS.donutHole) : 0,
    legend: {
      visible:
        !empty &&
        (visibility === 'visible' ||
          (visibility === 'auto' &&
            (shape === 'waffle' ||
              ((shape === 'pie' || shape === 'donut') && layers.length > 1)))),
      position: legendConfig?.position ?? 'right',
      nested,
      maxLines: legendConfig?.maxLines ?? 1,
      size: legendConfig?.size ?? 'auto',
      values: showValues,
      items: empty ? [] : items,
    },
    ...(empty ? { empty } : {}),
  };
};
