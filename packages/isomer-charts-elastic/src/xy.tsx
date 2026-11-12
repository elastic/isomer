/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// An xy Scene as Kibana's xy visualization draws it
// (`expression_xy/public/components/xy_chart.tsx` and `helpers/data_layers.tsx`):
// one Elastic Charts `Chart` with a series per Scene series and an axis per
// Scene axis. Colors, text, draw order and time-axis ticks are the Scene's;
// Elastic Charts computes other ticks, domains, stacks and point density from
// its intent, and labels those ticks through `formatAxisValue`.

import type { ReactNode } from 'react';
import {
  AnnotationDomainType,
  AreaSeries,
  Axis,
  BarSeries,
  ColorVariant,
  CurveType,
  type CustomTooltip,
  Fit,
  LineAnnotation,
  LineSeries,
  type PartialTheme,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  StackMode,
  Tooltip,
  TooltipContainer,
  TooltipHeader,
  TooltipTable,
  TooltipTableBody,
  TooltipTableCell,
  TooltipTableColorCell,
  TooltipTableRow,
} from '@elastic/charts';
import {
  cls,
  formatAxisValue,
  type SceneAnnotation,
  type SceneAxis,
  type SceneLegend,
  type SceneReferenceLine,
  type SceneRenderEnv,
  type XyScene,
  type XySeries,
} from '@elastic/isomer-primitives-charts/scene';

import { ariaDescriptionOf } from './accessibility';
import {
  isXyDatum,
  legendSelect,
  seriesOf,
  type XyDatum,
  xyHandlers,
} from './events';
import type { ElasticChartsOptions } from './options';
import { elasticModule } from './styles';
import { chromeTheme, kibanaBaseTheme } from './theme';

const POSITION = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
} as const;

/** Value axes are continuous; an ordinal or time value axis draws linear. */
const VALUE_SCALE = {
  ordinal: ScaleType.Linear,
  time: ScaleType.Linear,
  linear: ScaleType.Linear,
  log: ScaleType.Log,
  sqrt: ScaleType.Sqrt,
} as const;

const SCALE = {
  ordinal: ScaleType.Ordinal,
  time: ScaleType.Time,
  linear: ScaleType.Linear,
  log: ScaleType.Log,
  sqrt: ScaleType.Sqrt,
} as const;

const CURVE = {
  linear: CurveType.LINEAR,
  smooth: CurveType.CURVE_MONOTONE_X,
  stepped: CurveType.CURVE_STEP_AFTER,
} as const;

const FIT = {
  none: Fit.None,
  zero: Fit.Zero,
  linear: Fit.Linear,
  carry: Fit.Carry,
  lookahead: Fit.Lookahead,
  average: Fit.Average,
  nearest: Fit.Nearest,
} as const;

const POINTS = {
  auto: 'auto',
  visible: 'always',
  hidden: 'never',
} as const;

/** Kibana's `LegendSizeToPixels`. */
const LEGEND_SIZE = {
  auto: undefined,
  s: 80,
  m: 130,
  l: 180,
  xl: 230,
} as const;

const INSIDE = {
  top_left: { vAlign: Position.Top, hAlign: Position.Left },
  top_right: { vAlign: Position.Top, hAlign: Position.Right },
  bottom_left: { vAlign: Position.Bottom, hAlign: Position.Left },
  bottom_right: { vAlign: Position.Bottom, hAlign: Position.Right },
} as const;

/**
 * Labels a tick Elastic Charts chose: a category by its Scene label, a value
 * through `formatAxisValue`.
 */
export const tickLabeler = (
  axis: SceneAxis,
  scene: XyScene
): ((value: unknown) => string) => {
  const categories = new Map<number | string, string>(
    axis.id === 'x' && axis.scale === 'ordinal'
      ? scene.categories.map(({ x, label }) => [x, label])
      : []
  );
  return (value) => {
    if (typeof value === 'string') {
      return categories.get(value) ?? value;
    }
    if (typeof value !== 'number') {
      return '';
    }
    return categories.get(value) ?? formatAxisValue(scene, axis, value);
  };
};

/** The ids of reference lines drawn on an axis, so a data domain includes them. */
const referenceLineIds = ({ layers }: XyScene, axis: SceneAxis): string[] => {
  const ids: string[] = [];
  let index = 0;
  for (const layer of layers) {
    if (layer.kind === 'referenceLine') {
      if (layer.line.axis === axis.id) {
        ids.push(`reference-${index}`);
      }
      index++;
    }
  }
  return ids;
};

/** Kibana's `getAxisDomain`: a data domain fits the data unless it includes zero. */
const yDomainOf = (axis: SceneAxis, scene: XyScene) => {
  const { domain } = axis;
  if (domain === undefined) {
    return undefined;
  }
  if (domain.kind === 'custom') {
    return { min: domain.min, max: domain.max };
  }
  return {
    min: Number.NaN,
    max: Number.NaN,
    fit: !domain.includeZero,
    includeDataFromIds: referenceLineIds(scene, axis),
  };
};

const axisElement = (axis: SceneAxis, scene: XyScene): ReactNode => {
  const shared = {
    id: axis.id,
    position: POSITION[axis.position],
    ...(axis.title === undefined ? {} : { title: axis.title }),
    gridLine: { visible: axis.showGrid },
    tickFormat: tickLabeler(axis, scene),
    style: {
      tickLabel: { visible: axis.showTicks, rotation: axis.labelRotation },
      tickLine: { visible: axis.showTicks },
    },
  };
  if (axis.id === 'x') {
    // A Scene time axis is Elastic Charts' multi-layer one (its default
    // `timeAxisLayerCount: 2`), styled as Lens styles it: Elastic Charts picks
    // the same rasters the resolver did and labels them itself.
    return axis.timeTicks ? (
      <Axis
        key={axis.id}
        {...shared}
        style={{
          tickLabel: { visible: axis.showTicks },
          tickLine: { visible: axis.showTicks },
        }}
      />
    ) : (
      <Axis key={axis.id} {...shared} timeAxisLayerCount={0} />
    );
  }
  const domain = yDomainOf(axis, scene);
  return (
    <Axis
      key={axis.id}
      {...shared}
      groupId={axis.id}
      {...(domain === undefined ? {} : { domain })}
    />
  );
};

/** The categories in order on an ordinal x axis; else a custom domain's bounds and the stated bucket interval, unbounded as `NaN`, as Kibana's `getXDomain` builds it. */
const xDomainOf = ({ axes: { x }, categories }: XyScene) => {
  if (x.scale === 'ordinal') {
    return categories.map((category) => category.x);
  }
  const { domain, interval } = x;
  if (domain?.kind !== 'custom' && interval === undefined) {
    return undefined;
  }
  return {
    ...(domain?.kind === 'custom'
      ? { min: domain.min, max: domain.max }
      : { min: NaN, max: NaN }),
    ...(interval === undefined ? {} : { minInterval: interval }),
  };
};

/** Whether a data domain rounds out to readable values. */
const nice = (axis: SceneAxis | undefined): boolean =>
  axis?.domain?.kind === 'data' && axis.domain.rounding;

/** The datum for each mark, unstacked: Elastic Charts stacks it. */
export const seriesData = (series: XySeries, index: number): XyDatum[] =>
  series.marks.map(({ x, y }, mark) => ({ x, y, series: index, mark }));

/**
 * Each mark's label by the value Elastic Charts passes a value-label formatter, which is all it passes.
 * A percentage stack's share, and a value whose marks carry different labels, print through the y axis, as Lens labels every value.
 */
export const valueLabeler = (
  series: XySeries,
  scene: XyScene,
  axis: SceneAxis | undefined
) => {
  const throughAxis = (value: number) =>
    axis === undefined ? '' : formatAxisValue(scene, axis, value);
  if (series.stack?.mode === 'percentage' && axis !== undefined) {
    return (value: unknown) =>
      typeof value === 'number' ? throughAxis(value) : '';
  }
  const labels = new Map<number, string | undefined>();
  for (const { y, label } of series.marks) {
    if (y !== null) {
      labels.set(
        y,
        !labels.has(y) || labels.get(y) === label ? label : undefined
      );
    }
  }
  return (value: unknown) => {
    if (typeof value !== 'number') {
      return '';
    }
    return labels.has(value) && labels.get(value) === undefined
      ? throughAxis(value)
      : (labels.get(value) ?? '');
  };
};

const inOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/** Lens's gradient area fill, `helpers/data_layers.tsx`. */
const gradient = (stacked: boolean) => {
  const correction = 0.3;
  const start = (stacked ? 0.1 : 0.05) / correction;
  const end = 0.4 / correction;
  const stops = 12;
  return {
    type: 'linear' as const,
    stops: Array.from({ length: stops }, (_, i) => ({
      offset: i / (stops - 1),
      opacity: start + (end - start) * inOutSine(i / (stops - 1)),
      color: ColorVariant.Series,
    })),
  };
};

const FIT_LINE = {
  visible: true,
  stroke: ColorVariant.Series,
  opacity: 1,
  dash: [],
};

const seriesElement = (
  series: XySeries,
  index: number,
  scene: XyScene
): ReactNode => {
  const xScale = SCALE[scene.axes.x.scale];
  const yAxis = series.axis === 'y' ? scene.axes.y : scene.axes.y2;
  const stacked = series.stack !== undefined;
  const continuous = xScale !== ScaleType.Ordinal;
  const common = {
    id: `series-${index}`,
    name: series.label,
    groupId: series.axis,
    color: series.color,
    xScaleType: xScale,
    yScaleType: yAxis ? VALUE_SCALE[yAxis.scale] : ScaleType.Linear,
    xAccessor: 'x',
    yAccessors: ['y'],
    data: seriesData(series, index),
    xNice: nice(scene.axes.x),
    yNice: nice(yAxis),
    ...(stacked ? { stackAccessors: ['x'] } : {}),
    ...(series.stack?.mode === 'percentage'
      ? { stackMode: StackMode.Percentage }
      : {}),
    ...(xScale === ScaleType.Time
      ? { timeZone: scene.axes.x.timeZone ?? scene.timeZone }
      : {}),
    ...(series.valueLabels
      ? {
          displayValueSettings: {
            showValueLabel: true,
            valueFormatter: valueLabeler(series, scene, yAxis),
          },
        }
      : {}),
  };
  if (series.mark === 'bar') {
    const bars = seriesOf(scene).filter(({ mark }) => mark === 'bar').length;
    return (
      <BarSeries
        key={common.id}
        {...common}
        enableHistogramMode={continuous && (stacked || bars <= 1)}
        minBarHeight={scene.barMinimumHeight}
      />
    );
  }
  const { fitting } = series;
  const point = { visible: POINTS[series.points] };
  const line = {
    ...common,
    curve: CURVE[series.interpolation],
    fit:
      fitting.extend === 'none'
        ? FIT[fitting.kind]
        : {
            type: FIT[fitting.kind],
            endValue: fitting.extend === 'zero' ? 0 : ('nearest' as const),
          },
  };
  if (series.mark === 'line') {
    return (
      <LineSeries
        key={common.id}
        {...line}
        lineSeriesStyle={{
          point,
          ...(fitting.emphasize ? { fit: { line: FIT_LINE } } : {}),
        }}
      />
    );
  }
  return (
    <AreaSeries
      key={common.id}
      {...line}
      areaSeriesStyle={{
        point,
        area: {
          opacity: series.areaOpacity,
          ...(series.areaFill === 'gradient' && series.areaOpacity > 0
            ? { gradient: gradient(stacked) }
            : {}),
        },
        ...(fitting.emphasize
          ? {
              fit: {
                area: { opacity: series.areaOpacity || 0.5 },
                line: FIT_LINE,
              },
            }
          : {}),
      }}
    />
  );
};

/** Kibana's reference-line dash, `reference_lines/utils.tsx`. */
const dashOf = (style: 'solid' | 'dashed' | 'dotted', width: number) =>
  style === 'dashed'
    ? [width * 3, width]
    : style === 'dotted'
      ? [width, width]
      : undefined;

const referenceLineElements = (
  line: SceneReferenceLine,
  index: number,
  zIndex: number
): ReactNode[] => {
  const onX = line.axis === 'x';
  const dash = dashOf(line.strokeDash, line.strokeWidth);
  const elements: ReactNode[] = [
    <LineAnnotation
      key={`reference-${index}`}
      id={`reference-${index}`}
      zIndex={zIndex}
      domainType={
        onX ? AnnotationDomainType.XDomain : AnnotationDomainType.YDomain
      }
      {...(onX ? {} : { groupId: line.axis })}
      dataValues={[
        {
          dataValue: line.value,
          ...(line.label === undefined ? {} : { details: line.label }),
        },
      ]}
      style={{
        line: {
          stroke: line.color,
          strokeWidth: line.strokeWidth,
          opacity: 1,
          ...(dash ? { dash } : {}),
        },
      }}
    />,
  ];
  if (line.fill) {
    // A null end reaches the edge of the domain Elastic Charts computed.
    const [from, to] =
      line.fill === 'above' ? [line.value, null] : [null, line.value];
    elements.push(
      <RectAnnotation
        key={`reference-${index}-fill`}
        id={`reference-${index}-fill`}
        zIndex={zIndex}
        {...(onX ? {} : { groupId: line.axis })}
        dataValues={[
          {
            coordinates: onX ? { x0: from, x1: to } : { y0: from, y1: to },
          },
        ]}
        style={{ fill: line.color, opacity: 0.1 }}
      />
    );
  }
  return elements;
};

/** Kibana's `OUTSIDE_RECT_ANNOTATION_WIDTH`. */
const OUTSIDE_RECT_WIDTH = 8;

const annotationElement = (
  annotation: SceneAnnotation,
  index: number,
  zIndex: number,
  scene: XyScene
): ReactNode => {
  const id = `annotation-${index}`;
  if (annotation.kind === 'range') {
    return (
      <RectAnnotation
        key={id}
        id={id}
        zIndex={zIndex}
        dataValues={[
          {
            coordinates: { x0: annotation.from, x1: annotation.to },
            ...(annotation.label === undefined
              ? {}
              : { details: annotation.label }),
          },
        ]}
        style={{ fill: annotation.color, opacity: 1 }}
        {...(annotation.fill === 'outside'
          ? {
              outside: true,
              outsideDimension: Math.max(
                kibanaBaseTheme(scene.scheme).axes.tickLine.size,
                OUTSIDE_RECT_WIDTH
              ),
            }
          : {})}
      />
    );
  }
  const width = annotation.line?.width ?? 1;
  const dash = dashOf(annotation.line?.dash ?? 'solid', width);
  const details = annotation.text ?? annotation.label;
  return (
    <LineAnnotation
      key={id}
      id={id}
      zIndex={zIndex}
      domainType={AnnotationDomainType.XDomain}
      dataValues={[
        {
          dataValue: annotation.at,
          ...(details === undefined ? {} : { details }),
        },
      ]}
      style={{
        line: {
          stroke: annotation.color,
          strokeWidth: width,
          opacity: 1,
          ...(dash ? { dash } : {}),
        },
      }}
    />
  );
};

const legendProps = (legend: SceneLegend) => {
  const inside = legend.inside ? INSIDE[legend.inside] : undefined;
  const size = LEGEND_SIZE[legend.size];
  return {
    showLegend: legend.visible,
    legendPosition: inside
      ? {
          ...inside,
          direction: 'vertical' as const,
          floating: true,
          floatingColumns: legend.columns ?? 1,
        }
      : POSITION[legend.position],
    ...(!inside &&
    legend.layout === 'list' &&
    (legend.position === 'top' || legend.position === 'bottom')
      ? { legendLayout: 'list' as const }
      : {}),
    ...(size === undefined ? {} : { legendSize: size }),
    ...(legend.header === undefined ? {} : { legendTitle: legend.header }),
  };
};

/**
 * The hovered marks as Lens lists them: the x position as the Scene's category
 * labels it (else as its axis labels it), then each series with its unstacked value.
 */
export const sceneTooltip = (scene: XyScene): CustomTooltip => {
  const series = seriesOf(scene);
  const categories = new Map<number | string, string>(
    scene.categories.map(({ x, label }) => [x, label])
  );
  const tick = tickLabeler(scene.axes.x, scene);
  const label = (x: number | string) => categories.get(x) ?? tick(x);
  return ({ values }) => {
    const hovered = values.flatMap(({ datum }) => {
      const owner = isXyDatum(datum) ? series[datum.series] : undefined;
      const mark = isXyDatum(datum) ? owner?.marks[datum.mark] : undefined;
      return owner && mark ? [{ mark, owner }] : [];
    });
    const first = hovered[0];
    const header = first === undefined ? undefined : label(first.mark.x);
    const entries = hovered.map(({ mark, owner }) => ({
      label: owner.label,
      value: mark.label,
      color: owner.color,
    }));
    return (
      <TooltipContainer>
        {header === undefined ? null : <TooltipHeader>{header}</TooltipHeader>}
        <TooltipTable gridTemplateColumns="auto auto auto">
          <TooltipTableBody>
            {entries.map(({ label, value, color }, index) => (
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

/** "Filter for" and "Filter out" beside each legend item, as Kibana's legend action offers them. */
const legendAction =
  (scene: XyScene, env: SceneRenderEnv) =>
  ({
    series,
    label,
  }: {
    series: readonly { specId: string }[];
    label: string;
  }) => {
    const index = Number(series[0]?.specId.replace('series-', ''));
    const owner = seriesOf(scene)[index];
    if (owner === undefined) {
      return null;
    }
    return (
      <span className={cls(env, elasticModule.handles.legendAction)}>
        <button
          type="button"
          aria-label={`Filter for ${label}`}
          onClick={() => legendSelect(scene, env, owner, false)}>
          +
        </button>
        <button
          type="button"
          aria-label={`Filter out ${label}`}
          onClick={() => legendSelect(scene, env, owner, true)}>
          −
        </button>
      </span>
    );
  };

/**
 * Elastic Charts paints annotations with `zIndex <= 0` beneath every series
 * and the rest above them, each band in spec order. A helper layer before the
 * first series goes beneath; any later one goes above, except a range, which
 * Kibana's xy chart always paints beneath the data (`annotations.tsx` leaves
 * its `RectAnnotation` at the default `zIndex`).
 */
export const layerZIndex = (scene: XyScene, position: number): number => {
  const layer = scene.layers[position];
  const firstSeries = scene.layers.findIndex(({ kind }) => kind === 'series');
  const beneath =
    (layer?.kind === 'annotation' && layer.annotation.kind === 'range') ||
    (firstSeries !== -1 && position < firstSeries);
  return beneath ? position - scene.layers.length : position + 1;
};

/**
 * The Scene's layers in spec order. Each kind keeps its own index, so a
 * series' spec id is its position in {@link seriesOf}.
 */
const layerElements = (scene: XyScene): ReactNode[] => {
  const next = { series: 0, referenceLine: 0, annotation: 0 };
  return scene.layers.flatMap((layer, position) => {
    switch (layer.kind) {
      case 'series':
        return [seriesElement(layer.series, next.series++, scene)];
      case 'referenceLine':
        return referenceLineElements(
          layer.line,
          next.referenceLine++,
          layerZIndex(scene, position)
        );
      case 'annotation':
        return [
          annotationElement(
            layer.annotation,
            next.annotation++,
            layerZIndex(scene, position),
            scene
          ),
        ];
    }
  });
};

/** The base theme's overrides: the Scene's chrome and legend truncation. */
export const xyTheme = (scene: XyScene): PartialTheme => ({
  ...chromeTheme(scene.chrome),
  legend: { labelOptions: { maxLines: scene.legend.maxLines } },
});

/** An xy Scene's spec elements, for `<Chart>` or headless drawing. */
export const xySpecs = (
  scene: XyScene,
  env: SceneRenderEnv,
  options: ElasticChartsOptions
): ReactNode => {
  const offersLegend =
    env.onEvent !== undefined &&
    env.nodeId !== undefined &&
    scene.interactions.select.includes('legend');
  const continuous = SCALE[scene.axes.x.scale] !== ScaleType.Ordinal;
  const xDomain = xDomainOf(scene);
  return (
    <>
      <Tooltip customTooltip={sceneTooltip(scene)} />
      <Settings
        baseTheme={kibanaBaseTheme(scene.scheme)}
        theme={xyTheme(scene)}
        locale={scene.locale}
        rotation={scene.orientation === 'horizontal' ? 90 : 0}
        {...(xDomain === undefined ? {} : { xDomain })}
        debugState={options.debugState ?? false}
        {...(scene.title === undefined ? {} : { ariaLabel: scene.title })}
        ariaDescription={ariaDescriptionOf(scene)}
        allowBrushingLastHistogramBin={continuous}
        {...legendProps(scene.legend)}
        {...(offersLegend
          ? {
              legendAction: legendAction(scene, env),
              legendActionOnHover: true,
            }
          : {})}
        {...xyHandlers(scene, env)}
      />
      {axisElement(scene.axes.x, scene)}
      {scene.axes.y ? axisElement(scene.axes.y, scene) : null}
      {scene.axes.y2 ? axisElement(scene.axes.y2, scene) : null}
      {layerElements(scene)}
    </>
  );
};
