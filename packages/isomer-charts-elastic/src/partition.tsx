/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A partition Scene as Kibana's partition visualization draws it
// (`expression_partition_vis`: `PartitionVisComponent` and
// `getPartitionTheme`). The Scene's slices go to Elastic Charts as its leaves,
// keyed by slice, so names, colors, order and value text are the Scene's;
// Elastic Charts lays them out and sums each slice in the order the Scene does.

import type { ReactNode } from 'react';
import {
  type CustomTooltip,
  type Datum,
  LegendValue,
  type PartialTheme,
  Partition,
  type PartitionLayer,
  PartitionLayout,
  Position,
  Settings,
  type ShapeTreeNode,
  Tooltip,
  TooltipContainer,
  TooltipTable,
  TooltipTableBody,
  TooltipTableCell,
  TooltipTableColorCell,
  TooltipTableRow,
} from '@elastic/charts';
import {
  cls,
  type PartitionNode,
  type PartitionScene,
  type SceneRenderEnv,
} from '@elastic/isomer-primitives-charts/scene';

import { ariaDescriptionOf } from './accessibility';
import { partitionHandlers, partitionLegendSelect } from './events';
import type { ElasticChartsOptions } from './options';
import { elasticModule } from './styles';
import { chromeTheme, kibanaBaseTheme } from './theme';

const LAYOUT = {
  pie: PartitionLayout.sunburst,
  donut: PartitionLayout.sunburst,
  treemap: PartitionLayout.treemap,
  mosaic: PartitionLayout.mosaic,
  waffle: PartitionLayout.waffle,
} as const;

const POSITION = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
} as const;

/** Kibana's `LegendSizeToPixels`. */
const LEGEND_SIZE = {
  auto: undefined,
  s: 80,
  m: 130,
  l: 180,
  xl: 230,
} as const;

/** What each datum this engine passes Elastic Charts carries: one Scene leaf. */
export interface PartitionDatum {
  /** The key of each slice on the leaf's path, outermost first. */
  readonly keys: readonly string[];
  readonly value: number;
}

/** Every slice of the Scene, depth first in draw order. */
export const slicesOf = (
  nodes: readonly PartitionNode[]
): readonly PartitionNode[] =>
  nodes.flatMap((node) => [node, ...slicesOf(node.children)]);

/** The Scene's leaves, depth first in draw order: the data Elastic Charts sums. */
export const partitionData = (scene: PartitionScene): PartitionDatum[] => {
  const data: PartitionDatum[] = [];
  const walk = (nodes: readonly PartitionNode[], keys: readonly string[]) => {
    for (const node of nodes) {
      const path = [...keys, node.key];
      if (node.children.length === 0) {
        data.push({ keys: path, value: node.value });
      } else {
        walk(node.children, path);
      }
    }
  };
  walk(scene.nodes, []);
  return data;
};

/** The Scene slice an Elastic Charts key names. */
export const sliceByKey = (
  scene: PartitionScene
): ReadonlyMap<string, PartitionNode> =>
  new Map(slicesOf(scene.nodes).map((node) => [node.key, node]));

/**
 * Kibana's `rescaleFactor`: a pie, donut or waffle with slices under 2% of the
 * whole shrinks by 5% for each, at most 20%, to make room for outside labels.
 */
export const outerSizeRatio = (scene: PartitionScene): number => {
  const small = partitionData(scene).filter(
    ({ value }) => scene.total > 0 && value / scene.total < 0.02
  ).length;
  return small ? 1 / (1 + Math.min(small * 0.05, 0.2)) : 1;
};

/** Kibana's partition theme for the Scene: `getPartitionTheme` over the Scene's chrome. */
export const partitionTheme = (scene: PartitionScene): PartialTheme => {
  const pieLike = scene.shape !== 'treemap' && scene.shape !== 'mosaic';
  const hidden = scene.labels.categories === 'hidden';
  const noLinks = hidden || scene.labels.categories === 'inside';
  return {
    ...chromeTheme(scene.chrome),
    chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
    partition: {
      outerSizeRatio: pieLike ? outerSizeRatio(scene) : 1,
      minFontSize: 10,
      maxFontSize: 16,
      emptySizeRatio: scene.donutHole,
      sectorLineWidth: 1.5,
      sectorLineStroke: scene.chrome.background,
      circlePadding: 4,
      linkLabel: {
        maxCount: pieLike && noLinks ? 0 : 5,
        ...(pieLike && hidden
          ? { maximumSection: Number.POSITIVE_INFINITY }
          : {}),
        textColor: scene.chrome.text,
      },
      ...(!pieLike && hidden
        ? { fillLabel: { textColor: 'rgba(0,0,0,0)' } }
        : {}),
    },
    legend: { labelOptions: { maxLines: scene.legend.maxLines } },
  };
};

/** The hovered slice's tooltip from the Scene: the slice and each it sits in. */
export const partitionTooltip = (scene: PartitionScene): CustomTooltip => {
  const slices = sliceByKey(scene);
  return ({ values }) => {
    const key = values.at(-1)?.seriesIdentifier.key;
    const slice = key === undefined ? undefined : slices.get(String(key));
    if (!slice) {
      return null;
    }
    return (
      <TooltipContainer>
        <TooltipTable gridTemplateColumns="auto auto auto">
          <TooltipTableBody>
            {slice.tooltip.entries.map(({ label, value, color }, index) => (
              <TooltipTableRow key={index}>
                <TooltipTableColorCell color={color ?? 'transparent'} />
                <TooltipTableCell>{label}</TooltipTableCell>
                <TooltipTableCell>{value}</TooltipTableCell>
              </TooltipTableRow>
            ))}
          </TooltipTableBody>
        </TooltipTable>
      </TooltipContainer>
    );
  };
};

/**
 * The value text Elastic Charts draws. Slice labels ask for it through
 * `valueGetter`, which hands over `-1 - index` of the slice in
 * {@link slicesOf}, so each draws its own `valueLabel`. Legend values ask
 * with the slice's sum, which the Scene's `value` equals.
 */
export const partitionValueFormatter = (
  scene: PartitionScene
): ((value: number) => string) => {
  const slices = slicesOf(scene.nodes);
  const byValue = new Map<number, string>();
  for (const { value, valueText } of slices) {
    if (!byValue.has(value)) {
      byValue.set(value, valueText);
    }
  }
  return (value) =>
    value < 0
      ? (slices[-1 - value]?.valueLabel ?? '')
      : (byValue.get(value) ?? '');
};

const partitionLayers = (scene: PartitionScene): PartitionLayer[] => {
  const slices = sliceByKey(scene);
  const siblings = new Map<string, number>();
  const rank = (nodes: readonly PartitionNode[]) =>
    nodes.forEach((node, index) => {
      siblings.set(node.key, index);
      rank(node.children);
    });
  rank(scene.nodes);
  const order = (key: unknown) => siblings.get(String(key)) ?? 0;
  return scene.layers.map((_, depth) => ({
    groupByRollup: (datum: Datum) => (datum as PartitionDatum).keys[depth],
    nodeLabel: (key: unknown) => slices.get(String(key))?.label ?? '',
    showAccessor: () => true,
    sortPredicate: ([a]: [unknown, unknown], [b]: [unknown, unknown]) =>
      order(a) - order(b),
    fillLabel: {
      valueFont: { fontWeight: 700 },
      ...(scene.shape === 'mosaic' && depth === 0
        ? { minFontSize: 14, maxFontSize: 14, clipText: true }
        : {}),
    },
    shape: {
      fillColor: (key: unknown) =>
        slices.get(String(key))?.color ?? scene.chrome.background,
    },
  }));
};

/** "Filter for" and "Filter out" beside each legend item, as Kibana's legend action offers them. */
const legendAction =
  (scene: PartitionScene, env: SceneRenderEnv) =>
  ({
    series,
    label,
  }: {
    series: readonly { key: unknown }[];
    label: string;
  }) => {
    const key = series[0]?.key;
    if (typeof key !== 'string') {
      return null;
    }
    return (
      <span className={cls(env, elasticModule.handles.legendAction)}>
        <button
          type="button"
          aria-label={`Filter for ${label}`}
          onClick={() => partitionLegendSelect(scene, env, key, false)}>
          +
        </button>
        <button
          type="button"
          aria-label={`Filter out ${label}`}
          onClick={() => partitionLegendSelect(scene, env, key, true)}>
          −
        </button>
      </span>
    );
  };

/** A partition Scene's spec elements, for `<Chart>` or headless drawing; `null` when it is empty. */
export const partitionSpecs = (
  scene: PartitionScene,
  env: SceneRenderEnv,
  options: ElasticChartsOptions
): ReactNode => {
  if (scene.empty) {
    return null;
  }
  const { legend } = scene;
  const slices = slicesOf(scene.nodes);
  const index = new Map(slices.map((node, position) => [node.key, position]));
  const legendOrder = new Map(
    legend.items.map(({ key }, position) => [key, position])
  );
  const size = LEGEND_SIZE[legend.size];
  const offersSlices =
    env.onEvent !== undefined &&
    env.nodeId !== undefined &&
    scene.interactions.select.includes('slice');
  return (
    <>
      <Tooltip customTooltip={partitionTooltip(scene)} />
      <Settings
        baseTheme={kibanaBaseTheme(scene.scheme)}
        theme={partitionTheme(scene)}
        locale={scene.locale}
        debugState={options.debugState ?? false}
        {...(scene.title === undefined ? {} : { ariaLabel: scene.title })}
        ariaDescription={ariaDescriptionOf(scene)}
        showLegend={legend.visible}
        legendPosition={POSITION[legend.position]}
        {...(size === undefined ? {} : { legendSize: size })}
        flatLegend={!legend.nested}
        {...(legend.nested ? {} : { legendMaxDepth: 1 })}
        legendSort={(a, b) =>
          (legendOrder.get(String(a.key)) ?? 0) -
          (legendOrder.get(String(b.key)) ?? 0)
        }
        legendValues={legend.values ? [LegendValue.Value] : []}
        {...(offersSlices
          ? {
              legendAction: legendAction(scene, env),
              legendActionOnHover: true,
            }
          : {})}
        {...partitionHandlers(scene, env)}
      />
      <Partition
        id="partition"
        data={partitionData(scene)}
        layout={LAYOUT[scene.shape]}
        valueAccessor={(datum: Datum) => (datum as PartitionDatum).value}
        valueGetter={(node: ShapeTreeNode) =>
          -1 - (index.get(String(node.dataName)) ?? -1)
        }
        valueFormatter={partitionValueFormatter(scene)}
        {...(scene.shape === 'pie' || scene.shape === 'donut'
          ? { specialFirstInnermostSector: true }
          : {})}
        {...(scene.labels.categories === 'hidden' ? { topGroove: 0 } : {})}
        layers={partitionLayers(scene)}
      />
    </>
  );
};
