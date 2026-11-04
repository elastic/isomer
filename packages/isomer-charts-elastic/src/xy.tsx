/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// An xy Scene as Kibana's xy visualization draws it
// (`expression_xy/public/components/xy_chart.tsx` and `helpers/data_layers.tsx`):
// one Elastic Charts `Chart` with a series per Scene series and an axis per
// Scene axis. Strings come from the Scene through formatter callbacks; colors,
// domains, stacking and draw order are the Scene's.

import type { ReactNode } from 'react';
import {
  AnnotationDomainType,
  AreaSeries,
  Axis,
  BarSeries,
  Chart,
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
  Tooltip,
  TooltipContainer,
  TooltipHeader,
  TooltipTable,
  TooltipTableBody,
  TooltipTableCell,
  TooltipTableColorCell,
  TooltipTableRow,
} from '@elastic/charts';
import type {
  SceneAxis,
  SceneLegend,
  SceneReferenceLine,
  SceneRenderEnv,
  XyScene,
  XySeries,
} from '@elastic/isomer-primitives-charts/scene';

import { legendSelect, markOf, type XyDatum, xyHandlers } from './events';
import type { ElasticChartsOptions } from './options';
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

const near = (a: number, b: number) =>
  Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * A tick formatter that returns the Scene's label for each of its ticks.
 * Elastic Charts chooses tick positions itself; a position the Scene has no
 * tick for gets no label.
 */
export const tickLabeler = (
  axis: SceneAxis,
  scene: XyScene
): ((value: unknown) => string) => {
  const labels = new Map<number | string, string>();
  for (const { value, label } of axis.ticks) {
    labels.set(value, label);
  }
  if (axis.id === 'x') {
    for (const { x, label } of scene.categories) {
      if (!labels.has(x)) {
        labels.set(x, label);
      }
    }
  }
  return (value) => {
    if (typeof value !== 'number' && typeof value !== 'string') {
      return '';
    }
    const exact = labels.get(value);
    if (exact !== undefined || typeof value === 'string') {
      return exact ?? '';
    }
    for (const [at, label] of labels) {
      if (typeof at === 'number' && near(at, value)) {
        return label;
      }
    }
    return '';
  };
};

const isNumericDomain = (
  domain: SceneAxis['domain']
): domain is readonly [number, number] =>
  domain.length === 2 && typeof domain[0] === 'number';

const axisElement = (axis: SceneAxis, scene: XyScene): ReactNode => {
  const shared = {
    id: axis.id,
    position: POSITION[axis.position],
    ...(axis.title === undefined ? {} : { title: axis.title }),
    gridLine: { visible: axis.showGrid },
    ticks: Math.max(axis.ticks.length, 1),
    tickFormat: tickLabeler(axis, scene),
    style: {
      tickLabel: { visible: axis.showTicks, rotation: axis.labelRotation },
      tickLine: { visible: axis.showTicks },
    },
  };
  if (axis.id === 'x') {
    return <Axis key={axis.id} {...shared} timeAxisLayerCount={0} />;
  }
  const { domain } = axis;
  return (
    <Axis
      key={axis.id}
      {...shared}
      groupId={axis.id}
      {...(isNumericDomain(domain)
        ? { domain: { min: domain[0], max: domain[1] } }
        : {})}
    />
  );
};

const xDomainOf = ({ axes }: XyScene) => {
  const { domain } = axes.x;
  return isNumericDomain(domain)
    ? { min: domain[0], max: domain[1] }
    : [...domain];
};

/** The datum for each mark, with the segment height when its series stacks. */
export const seriesData = (series: XySeries, index: number): XyDatum[] =>
  series.marks.map((mark, at) => ({
    x: mark.x,
    y: series.stack && mark.y !== null ? mark.y - (mark.y0 ?? 0) : mark.y,
    series: index,
    mark: at,
  }));

/** Each mark's label by the value Elastic Charts passes a value-label formatter. */
const valueLabeler = (series: XySeries) => {
  const labels = new Map<number, string>();
  for (const mark of series.marks) {
    if (mark.y !== null) {
      labels.set(mark.y, mark.label);
      labels.set(mark.y - (mark.y0 ?? 0), mark.label);
    }
  }
  return (value: unknown) =>
    (typeof value === 'number' ? labels.get(value) : undefined) ?? '';
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
    ...(stacked ? { stackAccessors: ['x'] } : {}),
    ...(xScale === ScaleType.Time ? { timeZone: scene.timeZone } : {}),
    ...(series.valueLabels
      ? {
          displayValueSettings: {
            showValueLabel: true,
            valueFormatter: valueLabeler(series),
          },
        }
      : {}),
  };
  if (series.mark === 'bar') {
    const bars = scene.series.filter(({ mark }) => mark === 'bar').length;
    return (
      <BarSeries
        key={series.key}
        {...common}
        enableHistogramMode={continuous && (stacked || bars <= 1)}
        minBarHeight={scene.barMinimumHeight}
      />
    );
  }
  const { fitting } = series;
  const point = { visible: series.showPoints ? 'always' : 'never' } as const;
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
        key={series.key}
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
      key={series.key}
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
  scene: XyScene
): ReactNode[] => {
  const onX = line.axis === 'x';
  const dash = dashOf(line.strokeDash, line.strokeWidth);
  const elements: ReactNode[] = [
    <LineAnnotation
      key={`reference-${index}`}
      id={`reference-${index}`}
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
    const axis = onX
      ? scene.axes.x
      : line.axis === 'y'
        ? scene.axes.y
        : scene.axes.y2;
    const domain = axis?.domain;
    const [min, max] =
      domain && isNumericDomain(domain) ? domain : [undefined, undefined];
    const [from, to] =
      line.fill === 'above' ? [line.value, max] : [min, line.value];
    elements.push(
      <RectAnnotation
        key={`reference-${index}-fill`}
        id={`reference-${index}-fill`}
        {...(onX ? {} : { groupId: line.axis })}
        dataValues={[
          {
            coordinates: onX
              ? { x0: from ?? null, x1: to ?? null }
              : { y0: from ?? null, y1: to ?? null },
          },
        ]}
        style={{ fill: line.color, opacity: 0.1 }}
      />
    );
  }
  return elements;
};

const annotationElements = (scene: XyScene): ReactNode[] =>
  scene.annotations.map((annotation, index) => {
    const id = `annotation-${index}`;
    if (annotation.kind === 'range') {
      return (
        <RectAnnotation
          key={id}
          id={id}
          dataValues={[
            {
              coordinates: { x0: annotation.from, x1: annotation.to },
              ...(annotation.label === undefined
                ? {}
                : { details: annotation.label }),
            },
          ]}
          style={{ fill: annotation.color, opacity: 1 }}
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
  });

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

/** The tooltip of the hovered marks, as the Scene writes it. */
const sceneTooltip =
  (scene: XyScene): CustomTooltip =>
  ({ values }) => {
    const marks = values.flatMap(({ datum }) => {
      const mark = markOf(scene, datum);
      return mark ? [mark] : [];
    });
    const header = marks.find(({ tooltip }) => tooltip.header)?.tooltip.header;
    const entries = marks.flatMap(({ tooltip }) => tooltip.entries);
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
    const key = scene.series[index]?.key;
    if (key === undefined) {
      return null;
    }
    return (
      <span style={{ display: 'inline-flex', gap: 2 }}>
        <button
          type="button"
          aria-label={`Filter for ${label}`}
          onClick={() => legendSelect(scene, env, key, false)}>
          +
        </button>
        <button
          type="button"
          aria-label={`Filter out ${label}`}
          onClick={() => legendSelect(scene, env, key, true)}>
          −
        </button>
      </span>
    );
  };

/** The base theme's overrides: the Scene's chrome and legend truncation. */
export const xyTheme = (scene: XyScene): PartialTheme => ({
  ...chromeTheme(scene.chrome),
  legend: { labelOptions: { maxLines: scene.legend.maxLines } },
});

export const XyChart = ({
  scene,
  env,
  options,
}: {
  scene: XyScene;
  env: SceneRenderEnv;
  options: ElasticChartsOptions;
}): ReactNode => {
  const offersLegend =
    env.onEvent !== undefined &&
    env.nodeId !== undefined &&
    scene.interactions.select.includes('legend');
  const continuous = SCALE[scene.axes.x.scale] !== ScaleType.Ordinal;
  return (
    <Chart size={scene.size ?? { width: '100%', height: '100%' }}>
      <Tooltip customTooltip={sceneTooltip(scene)} />
      <Settings
        baseTheme={kibanaBaseTheme(scene.scheme)}
        theme={xyTheme(scene)}
        locale={scene.locale}
        rotation={scene.orientation === 'horizontal' ? 90 : 0}
        xDomain={xDomainOf(scene)}
        debugState={options.debugState ?? false}
        {...(scene.title === undefined ? {} : { ariaLabel: scene.title })}
        ariaDescription={scene.summary}
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
      {scene.series.map((series, index) => seriesElement(series, index, scene))}
      {scene.referenceLines.flatMap((line, index) =>
        referenceLineElements(line, index, scene)
      )}
      {annotationElements(scene)}
    </Chart>
  );
};
