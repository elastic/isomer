/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A heatmap Scene as Kibana's heat map draws it (`expression_heatmap`:
// `HeatmapComponent`). Each position goes to Elastic Charts as its index in the
// Scene's order (or its instant, on a time axis), and each band with the
// Scene's bounds, color and label, so order, labels and colors are the
// Scene's; Elastic Charts lays the grid out.

import type { ReactNode } from 'react';
import {
  type CustomTooltip,
  Heatmap,
  type HeatmapBandsColorScale,
  type PartialTheme,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  TooltipContainer,
  TooltipTable,
  TooltipTableBody,
  TooltipTableCell,
  TooltipTableColorCell,
  TooltipTableRow,
} from '@elastic/charts';
import {
  formatAxisValue,
  type HeatmapScene,
  type SceneRenderEnv,
} from '@elastic/isomer-primitives-charts/scene';

import { ariaDescriptionOf } from './accessibility';
import { heatmapHandlers } from './events';
import type { ElasticChartsOptions } from './options';
import { chromeTheme, kibanaBaseTheme } from './theme';

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

/** What each datum this engine passes Elastic Charts carries. */
export interface HeatmapDatum {
  /** The position's instant on a time axis; else its index in `x.categories`. */
  readonly x: number;
  /** The position's index in `y.categories`. */
  readonly y: number;
  /** `null` for a position no cell fills, which Elastic Charts still lays out. */
  readonly value: number | null;
}

/**
 * The data Elastic Charts draws: each Scene cell at its index, then a
 * valueless datum for each position no cell fills, so the axes hold every
 * position the Scene does.
 */
export const heatmapData = (scene: HeatmapScene): HeatmapDatum[] => {
  const xOf = (index: number): number => {
    const { x } = scene.x.categories[index]!;
    return scene.x.scale === 'time' ? (x as number) : index;
  };
  const data: HeatmapDatum[] = scene.cells.map(({ x, y, value }) => ({
    x: xOf(x),
    y,
    value,
  }));
  const xs = new Set(scene.cells.map(({ x }) => x));
  const ys = new Set(scene.cells.map(({ y }) => y));
  scene.x.categories.forEach((_, index) => {
    if (!xs.has(index)) {
      data.push({ x: xOf(index), y: 0, value: null });
    }
  });
  scene.y.categories.forEach((_, index) => {
    if (!ys.has(index)) {
      data.push({ x: xOf(0), y: index, value: null });
    }
  });
  return data;
};

/** The Scene's bands as Elastic Charts' color scale: an open bound is infinite. */
export const heatmapColorScale = (
  scene: HeatmapScene
): HeatmapBandsColorScale => ({
  type: 'bands',
  bands: scene.bands.map(({ start, end, color, label }) => ({
    start: start ?? Number.NEGATIVE_INFINITY,
    end: end ?? Number.POSITIVE_INFINITY,
    color,
    label,
  })),
});

/**
 * The text Elastic Charts writes for a value: a cell's `valueText`. It sees
 * only the value, so a value two cells share with different `valueText`s
 * prints none rather than another's.
 */
export const heatmapValueFormatter = (
  scene: HeatmapScene
): ((value: number) => string) => {
  const byValue = new Map<number, string | undefined>();
  for (const { value, valueText } of scene.cells) {
    byValue.set(
      value,
      !byValue.has(value) || byValue.get(value) === valueText
        ? valueText
        : undefined
    );
  }
  return (value) => byValue.get(value) ?? '';
};

/** A position's label: its category's on an ordinal axis, `formatAxisValue` on a time axis. */
export const heatmapXLabel = (
  scene: HeatmapScene
): ((value: string | number) => string) => {
  if (scene.x.scale === 'time') {
    return (value) => formatAxisValue(scene, scene.x, Number(value));
  }
  return (value) => scene.x.categories[Number(value)]?.label ?? '';
};

/** Kibana's heat map theme for the Scene: grid lines, cell labels and axis labels, padded as Kibana pads an axis with a column. */
export const heatmapTheme = (scene: HeatmapScene): PartialTheme => ({
  ...chromeTheme(scene.chrome),
  legend: { labelOptions: { maxLines: scene.legend.maxLines } },
  heatmap: {
    grid: {
      stroke: { width: scene.gridLines.width, color: scene.gridLines.color },
    },
    cell: {
      maxWidth: 'fill',
      maxHeight: 'fill',
      label: {
        visible: scene.cellLabels,
        minFontSize: 8,
        maxFontSize: 18,
        useGlobalMinFontSize: true,
      },
      border: { strokeWidth: 0 },
    },
    xAxisLabel: {
      visible: scene.x.showLabels,
      textColor: scene.chrome.textSubdued,
      padding: 8,
      rotation: Math.abs(scene.x.labelRotation),
    },
    yAxisLabel: {
      visible: scene.y.showLabels,
      textColor: scene.chrome.textSubdued,
      padding: scene.y.column === undefined ? 0 : 8,
    },
  },
});

/** The hovered cell's tooltip from the Scene: its positions and its value. */
export const heatmapTooltip = (scene: HeatmapScene): CustomTooltip => {
  const at = new Map(
    scene.cells.map((cell) => [`${cell.x}:${cell.y}`, cell] as const)
  );
  const xIndex =
    scene.x.scale === 'time'
      ? new Map(scene.x.categories.map(({ x }, index) => [x, index]))
      : undefined;
  return ({ values }) => {
    const datum = values[0]?.datum as HeatmapDatum | undefined;
    const x = datum && (xIndex ? xIndex.get(datum.x) : datum.x);
    const cell =
      datum && x !== undefined ? at.get(`${x}:${datum.y}`) : undefined;
    if (!cell) {
      return null;
    }
    return (
      <TooltipContainer>
        <TooltipTable gridTemplateColumns="auto auto auto">
          <TooltipTableBody>
            {cell.tooltip.entries.map(({ label, value, color }, index) => (
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

/** A heatmap Scene's spec elements, for `<Chart>` or headless drawing; `null` when it is empty. */
export const heatmapSpecs = (
  scene: HeatmapScene,
  env: SceneRenderEnv,
  options: ElasticChartsOptions
): ReactNode => {
  if (scene.empty) {
    return null;
  }
  const { legend, x, y } = scene;
  const size = LEGEND_SIZE[legend.size];
  return (
    <>
      <Tooltip customTooltip={heatmapTooltip(scene)} />
      <Settings
        baseTheme={kibanaBaseTheme(scene.scheme)}
        theme={heatmapTheme(scene)}
        locale={scene.locale}
        debugState={options.debugState ?? false}
        {...(scene.title === undefined ? {} : { ariaLabel: scene.title })}
        ariaDescription={ariaDescriptionOf(scene)}
        showLegend={legend.visible}
        legendPosition={POSITION[legend.position]}
        {...(size === undefined ? {} : { legendSize: size })}
        {...heatmapHandlers(scene, env)}
      />
      <Heatmap
        id="heatmap"
        name={scene.valueLabel}
        colorScale={heatmapColorScale(scene)}
        data={heatmapData(scene)}
        xAccessor="x"
        yAccessor="y"
        valueAccessor="value"
        valueFormatter={heatmapValueFormatter(scene)}
        xScale={
          x.scale === 'time'
            ? {
                type: ScaleType.Time,
                interval: { type: 'fixed', unit: 'ms', value: x.interval! },
              }
            : { type: ScaleType.Ordinal }
        }
        xSortPredicate="numAsc"
        ySortPredicate="numAsc"
        timeZone={x.timeZone ?? scene.timeZone}
        xAxisTitle={x.title ?? ''}
        yAxisTitle={y.title ?? ''}
        xAxisLabelName={x.label}
        yAxisLabelName={y.label}
        xAxisLabelFormatter={heatmapXLabel(scene)}
        yAxisLabelFormatter={(value) =>
          y.categories[Number(value)]?.label ?? ''
        }
      />
    </>
  );
};
