/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Hand-written Scenes that reach every part of the xy and metric drawings.
// They are Scenes, not nodes: what `isomer-svg` draws is checked against them.

import type {
  MetricScene,
  SceneChrome,
  SceneInteractions,
  SceneTable,
  XyMark,
  XyScene,
  XySeries,
} from '../scene/types';

export const darkChrome: SceneChrome = {
  text: '#DFE5EF',
  textSubdued: '#A6B3C9',
  axis: '#3D4A61',
  gridLine: '#2B394F',
  background: '#0B1628',
  border: '#3D4A61',
};

const lightChrome: SceneChrome = {
  text: '#384861',
  textSubdued: '#516381',
  axis: '#CAD3E2',
  gridLine: '#E3E8F2',
  background: '#FFFFFF',
  border: '#CAD3E2',
};

const emptyTable: SceneTable = { columns: [], rows: [] };

const noInteractions: SceneInteractions = {
  select: [],
  sync: { cursor: false, tooltips: false },
  emphasis: [],
};

const mark = (
  row: number,
  x: number | string,
  y: number | null,
  extra: Partial<XyMark> = {}
): XyMark => ({
  source: { rows: [row], columns: ['x', 'y'] },
  x,
  y,
  label: y === null ? '' : `v${y}`,
  tooltip: { entries: [] },
  description: `row ${row}`,
  ...extra,
});

const series = (
  key: string,
  color: string,
  marks: XyMark[],
  extra: Partial<XySeries> = {}
): XySeries => ({
  key,
  label: `Series ${key}`,
  mark: 'line',
  axis: 'y',
  color,
  interpolation: 'linear',
  fitting: { kind: 'none', emphasize: false, extend: 'none' },
  showPoints: false,
  areaOpacity: 0.3,
  areaFill: 'solid',
  valueLabels: false,
  source: { rows: marks.flatMap(({ source }) => source.rows), columns: ['y'] },
  marks,
  ...extra,
});

const categories = ['web-01', 'web-02', 'web-03'];

/** Stacked bars on an ordinal x, a line on y2, reference lines, a legend on the right. */
export const stackedBarsScene: XyScene = {
  kind: 'xy',
  scheme: 'light',
  size: { width: 600, height: 300 },
  locale: 'en',
  timeZone: 'UTC',
  chrome: lightChrome,
  summary: 'Errors and successes by host, with latency.',
  table: emptyTable,
  interactions: noInteractions,
  categories: [],
  orientation: 'vertical',
  axes: {
    x: {
      id: 'x',
      position: 'bottom',
      scale: 'ordinal',
      domain: categories,
      ticks: categories.map((value) => ({ value, label: value })),
      title: 'host.name',
      showTicks: true,
      showGrid: false,
      labelRotation: -45,
    },
    y: {
      id: 'y',
      position: 'left',
      scale: 'linear',
      domain: [0, 100],
      ticks: [0, 50, 100].map((value) => ({ value, label: `${value} req` })),
      title: 'Requests',
      showTicks: true,
      showGrid: true,
      labelRotation: 0,
    },
    y2: {
      id: 'y2',
      position: 'right',
      scale: 'linear',
      domain: [0, 2000],
      ticks: [0, 1000, 2000].map((value) => ({ value, label: `${value} ms` })),
      showTicks: true,
      showGrid: false,
      labelRotation: 0,
    },
  },
  series: [
    series(
      'ok',
      '#54B399',
      [mark(0, 'web-01', 60), mark(1, 'web-02', 40), mark(2, 'web-03', 30)],
      {
        mark: 'bar',
        stack: { group: 'requests', mode: 'stacked' },
        valueLabels: true,
      }
    ),
    series(
      'error',
      '#E7664C',
      [
        mark(3, 'web-01', 80, { y0: 60 }),
        mark(4, 'web-02', 45, { y0: 40 }),
        mark(5, 'web-03', 31, { y0: 30, partial: true }),
      ],
      { mark: 'bar', stack: { group: 'requests', mode: 'stacked' } }
    ),
    series(
      'latency',
      '#6092C0',
      [
        mark(6, 'web-01', 900),
        mark(7, 'web-02', 1500),
        mark(8, 'web-03', 1200),
      ],
      { axis: 'y2', showPoints: true, interpolation: 'smooth' }
    ),
    series('muted', '#D6BF57', [mark(9, 'web-01', 10)], { mark: 'bar' }),
  ],
  referenceLines: [
    {
      axis: 'y',
      value: 75,
      label: 'SLO',
      color: '#BD271E',
      fill: 'above',
      strokeWidth: 2,
      strokeDash: 'dashed',
      textPosition: 'right',
    },
  ],
  annotations: [],
  legend: {
    visible: true,
    position: 'right',
    layout: 'list',
    maxLines: 1,
    size: 'auto',
    header: 'Outcome',
    items: [
      {
        key: 'ok',
        label: 'Series ok',
        color: '#54B399',
        hidden: false,
        statistics: [{ name: 'sum', value: '130' }],
        source: { rows: [0, 1, 2], columns: ['y'] },
        description: 'ok',
      },
      {
        key: 'error',
        label: 'Series error',
        color: '#E7664C',
        hidden: false,
        statistics: [],
        source: { rows: [3, 4, 5], columns: ['y'] },
        description: 'error',
      },
      {
        key: 'latency',
        label: 'Series latency',
        color: '#6092C0',
        hidden: false,
        statistics: [],
        source: { rows: [6, 7, 8], columns: ['y'] },
        description: 'latency',
      },
      {
        key: 'muted',
        label: 'Series muted',
        color: '#D6BF57',
        hidden: true,
        statistics: [],
        source: { rows: [9], columns: ['y'] },
        description: 'muted',
      },
    ],
  },
  barMinimumHeight: 1,
};

const HOUR = 3_600_000;
const START = Date.UTC(2026, 10, 3);
const at = (hour: number) => START + hour * HOUR;

/** A time series with gaps, fitting, an area, annotations, the current time, in dark. */
export const gapsScene: XyScene = {
  kind: 'xy',
  scheme: 'dark',
  locale: 'en',
  timeZone: 'UTC',
  chrome: darkChrome,
  summary: 'Bytes over time with gaps.',
  table: emptyTable,
  interactions: noInteractions,
  categories: [],
  orientation: 'vertical',
  axes: {
    x: {
      id: 'x',
      position: 'bottom',
      scale: 'time',
      domain: [at(0), at(5)],
      ticks: [0, 1, 2, 3, 4, 5].map((hour) => ({
        value: at(hour),
        label: `0${hour}:00`,
      })),
      showTicks: true,
      showGrid: true,
      labelRotation: 0,
    },
    y: {
      id: 'y',
      position: 'left',
      scale: 'linear',
      domain: [0, 10],
      ticks: [0, 5, 10].map((value) => ({ value, label: `${value} KB` })),
      showTicks: true,
      showGrid: true,
      labelRotation: 0,
    },
  },
  series: [
    series(
      'broken',
      '#16C5C0',
      [0, 1, 2, 3, 4, 5].map((hour) =>
        mark(hour, at(hour), hour === 2 ? null : hour + 1)
      )
    ),
    series(
      'fitted',
      '#D36086',
      [0, 1, 2, 3, 4, 5].map((hour) =>
        mark(6 + hour, at(hour), hour === 3 ? null : 8 - hour)
      ),
      {
        mark: 'area',
        fitting: { kind: 'linear', emphasize: true, extend: 'none' },
        interpolation: 'stepped',
      }
    ),
  ],
  referenceLines: [],
  annotations: [
    {
      kind: 'point',
      at: at(1),
      label: 'Deploy',
      color: '#F990C0',
      tooltip: { entries: [] },
    },
    {
      kind: 'range',
      from: at(3),
      to: at(4),
      label: 'Incident',
      color: '#E7664C',
      fill: 'inside',
      tooltip: { entries: [] },
    },
  ],
  legend: {
    visible: true,
    position: 'bottom',
    layout: 'grid',
    maxLines: 1,
    size: 'auto',
    items: [
      {
        key: 'broken',
        label: 'Series broken',
        color: '#16C5C0',
        hidden: false,
        statistics: [],
        source: { rows: [0], columns: ['y'] },
        description: 'broken',
      },
      {
        key: 'fitted',
        label: 'Series fitted',
        color: '#D36086',
        hidden: false,
        statistics: [],
        source: { rows: [6], columns: ['y'] },
        description: 'fitted',
      },
    ],
  },
  barMinimumHeight: 1,
  currentTime: at(5),
};

/** Horizontal bars: the x axis on the left, values along the bottom. */
export const horizontalBarsScene: XyScene = {
  ...stackedBarsScene,
  summary: 'Requests by host, horizontal.',
  orientation: 'horizontal',
  axes: {
    x: { ...stackedBarsScene.axes.x, position: 'left', labelRotation: 0 },
    y: { ...stackedBarsScene.axes.y!, position: 'bottom' },
  },
  series: [stackedBarsScene.series[0]!],
  referenceLines: [],
  legend: { ...stackedBarsScene.legend, visible: false },
};

/** Six tiles in two rows: progress, trend, badges, alignment. */
export const tilesScene: MetricScene = {
  kind: 'metric',
  scheme: 'light',
  locale: 'en',
  timeZone: 'UTC',
  chrome: lightChrome,
  summary: 'Memory used by host.',
  table: emptyTable,
  interactions: noInteractions,
  layout: {
    columns: 3,
    rows: 2,
    density: 'default',
    valuePosition: 'middle',
    labelsAlignment: 'center',
    valueAlignment: 'left',
    valueSizing: 'fill',
    secondaryAlignment: 'right',
  },
  tiles: [0, 1, 2, 3, 4, 5].map((row) => ({
    source: { rows: [row], columns: ['host', 'used'] },
    title: `web-0${row}`,
    ...(row === 0 && { subtitle: 'Memory' }),
    value: {
      text: `${row * 100 + 12} GB`,
      raw: row * 100 + 12,
      color: '#1D2A3E',
    },
    background: row === 1 ? '#F6726A' : '#FFFFFF',
    ...(row === 2 && {
      secondary: {
        label: 'vs last week',
        labelPlacement: 'before' as const,
        text: '+12%',
        color: '#FFFFFF',
        badge: {
          direction: 'increase' as const,
          color: '#24C292',
          showIcon: true,
        },
      },
    }),
    ...(row === 3 && {
      progress: {
        fraction: 0.4,
        orientation: 'horizontal' as const,
        color: '#0B64DD',
        track: '#E3E8F2',
      },
    }),
    ...(row === 4 && {
      progress: {
        fraction: 1.5,
        orientation: 'vertical' as const,
        color: '#0B64DD',
        track: '#E3E8F2',
      },
    }),
    ...(row === 5 && {
      trend: {
        points: [
          { x: 0, y: 1 },
          { x: 1, y: null },
          { x: 2, y: 3 },
        ],
        xDomain: [0, 2] as const,
        yDomain: [0, 4] as const,
        color: '#61A2FF',
      },
    }),
    tooltip: { entries: [] },
    description: `host ${row}`,
  })),
};
