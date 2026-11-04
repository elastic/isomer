/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SceneAnnotation,
  SceneAxis,
  SceneLegend,
  SceneLegendItem,
  SceneReferenceLine,
  SceneSize,
  XyMark,
  XyScene,
  XySeries,
} from '../scene/types';

import { centeredBaseline, root, text } from './parts';
import { baselineOf, type PixelScale, px, scaleFor, textWidth } from './scale';
import { SVG_THEME } from './theme';
import { el, type SvgElement, withAttrs } from './tree';

const { font, xy: theme, legend: legendTheme } = SVG_THEME;

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const isHorizontal = (axis: SceneAxis) =>
  axis.position === 'top' || axis.position === 'bottom';

const lineHeight = (size: number) => size * font.lineHeight;

// ---- Legend ---------------------------------------------------------------

const legendLabel = (item: SceneLegendItem) =>
  [item.label, ...item.statistics.map(({ value }) => value)].join('  ');

const legendItemWidth = (item: SceneLegendItem) =>
  legendTheme.swatch +
  legendTheme.swatchGap +
  textWidth(legendLabel(item), font.legend);

interface LegendLayout {
  readonly reserve: Partial<
    Record<'left' | 'right' | 'top' | 'bottom', number>
  >;
  readonly rows: readonly (readonly SceneLegendItem[])[];
}

const isSide = (legend: SceneLegend) =>
  legend.position === 'left' || legend.position === 'right';

const layoutLegend = (legend: SceneLegend, width: number): LegendLayout => {
  if (!legend.visible || legend.items.length === 0) {
    return { reserve: {}, rows: [] };
  }
  const header = legend.header ? 1 : 0;
  if (isSide(legend) || legend.inside) {
    const rows = legend.items.map((item) => [item]);
    return {
      reserve: legend.inside
        ? {}
        : { [legend.position]: legendTheme.sideWidth + theme.padding },
      rows,
    };
  }
  const rows: SceneLegendItem[][] = [];
  let used = Infinity;
  for (const item of legend.items) {
    const itemWidth = legendItemWidth(item) + legendTheme.itemGap;
    if (used + itemWidth > width && rows.length < legend.maxLines) {
      rows.push([]);
      used = 0;
    }
    if (used + itemWidth > width && rows.length >= legend.maxLines) {
      break;
    }
    rows[rows.length - 1]!.push(item);
    used += itemWidth;
  }
  return {
    reserve: {
      [legend.position]:
        (rows.length + header) * legendTheme.rowHeight + theme.padding,
    },
    rows,
  };
};

const drawLegend = (
  scene: XyScene,
  layout: LegendLayout,
  outer: Box,
  plot: Box
): SvgElement | null => {
  const { legend, chrome } = scene;
  if (layout.rows.length === 0) {
    return null;
  }
  const rowHeight = legendTheme.rowHeight;
  const header = legend.header ? 1 : 0;
  const height = (layout.rows.length + header) * rowHeight;
  const sideWidth = legendTheme.sideWidth;
  let left: number;
  let top: number;
  if (legend.inside) {
    left = legend.inside.endsWith('left')
      ? plot.left + theme.padding
      : plot.right - sideWidth - theme.padding;
    top = legend.inside.startsWith('top')
      ? plot.top + theme.padding
      : plot.bottom - height - theme.padding;
  } else if (legend.position === 'right') {
    left = outer.right - sideWidth;
    top = plot.top;
  } else if (legend.position === 'left') {
    left = outer.left;
    top = plot.top;
  } else if (legend.position === 'top') {
    left = plot.left;
    top = outer.top;
  } else {
    left = plot.left;
    top = outer.bottom - height;
  }
  const items = layout.rows.flatMap((row, rowIndex) => {
    let x = left;
    const y = top + (rowIndex + header) * rowHeight + rowHeight / 2;
    return row.map((item) => {
      const itemX = x;
      x += legendItemWidth(item) + legendTheme.itemGap;
      return el(
        'g',
        {
          'data-legend-key': item.key,
          opacity: item.hidden ? legendTheme.hiddenOpacity : undefined,
        },
        el('rect', {
          x: px(itemX),
          y: px(y - legendTheme.swatch / 2),
          width: legendTheme.swatch,
          height: legendTheme.swatch,
          fill: item.color,
          'data-legend-toggle': item.key,
        }),
        withAttrs(
          text(item.label, {
            x: itemX + legendTheme.swatch + legendTheme.swatchGap,
            y: centeredBaseline(y, font.legend),
            size: font.legend,
            color: chrome.text,
          }),
          { 'data-legend-select': item.key }
        ),
        item.statistics.map((statistic, index) =>
          text(statistic.value, {
            x:
              itemX +
              legendTheme.swatch +
              legendTheme.swatchGap +
              textWidth(
                [
                  item.label,
                  ...item.statistics.slice(0, index).map(({ value }) => value),
                ].join('  ') + '  ',
                font.legend
              ),
            y: centeredBaseline(y, font.legend),
            size: font.legend,
            color: chrome.textSubdued,
          })
        )
      );
    });
  });
  return el(
    'g',
    { 'data-part': 'legend' },
    legend.header &&
      text(legend.header, {
        x: left,
        y: centeredBaseline(top + rowHeight / 2, font.legend),
        size: font.legend,
        color: chrome.text,
        weight: 'bold',
      }),
    items
  );
};

// ---- Axes -----------------------------------------------------------------

const maxLabelWidth = (axis: SceneAxis) =>
  Math.max(0, ...axis.ticks.map(({ label }) => textWidth(label, font.tick)));

const axisThickness = (axis: SceneAxis): number => {
  const title = axis.title
    ? lineHeight(font.axisTitle) + theme.axisTitleGap
    : 0;
  if (!axis.showTicks) {
    return title;
  }
  const labels = isHorizontal(axis)
    ? axis.labelRotation === 0
      ? lineHeight(font.tick)
      : axis.labelRotation === -90
        ? maxLabelWidth(axis)
        : maxLabelWidth(axis) * Math.SQRT1_2 + font.tick
    : maxLabelWidth(axis);
  return theme.tickLength + theme.tickGap + labels + title;
};

const axesOf = (scene: XyScene): SceneAxis[] =>
  [scene.axes.x, scene.axes.y, scene.axes.y2].filter(
    (axis): axis is SceneAxis => axis !== undefined
  );

const drawAxis = (
  scene: XyScene,
  axis: SceneAxis,
  scale: PixelScale,
  plot: Box
): SvgElement => {
  const { chrome } = scene;
  const horizontal = isHorizontal(axis);
  const edge = {
    bottom: plot.bottom,
    top: plot.top,
    left: plot.left,
    right: plot.right,
  }[axis.position];
  const outward =
    axis.position === 'bottom' || axis.position === 'right' ? 1 : -1;
  const line = horizontal
    ? el('line', {
        x1: px(plot.left),
        x2: px(plot.right),
        y1: px(edge),
        y2: px(edge),
        stroke: chrome.axis,
        'stroke-width': theme.axisStrokeWidth,
      })
    : el('line', {
        x1: px(edge),
        x2: px(edge),
        y1: px(plot.top),
        y2: px(plot.bottom),
        stroke: chrome.axis,
        'stroke-width': theme.axisStrokeWidth,
      });
  const ticks = axis.showTicks
    ? axis.ticks.map((tick) => {
        const at = scale(tick.value);
        const tickEnd = edge + outward * theme.tickLength;
        const labelAt = tickEnd + outward * theme.tickGap;
        const mark = horizontal
          ? el('line', {
              x1: px(at),
              x2: px(at),
              y1: px(edge),
              y2: px(tickEnd),
              stroke: chrome.axis,
              'stroke-width': theme.axisStrokeWidth,
            })
          : el('line', {
              x1: px(edge),
              x2: px(tickEnd),
              y1: px(at),
              y2: px(at),
              stroke: chrome.axis,
              'stroke-width': theme.axisStrokeWidth,
            });
        let label: SvgElement;
        if (horizontal && axis.labelRotation !== 0) {
          label = text(tick.label, {
            x: at,
            y: labelAt + (outward > 0 ? font.tick * 0.35 : 0),
            size: font.tick,
            color: chrome.textSubdued,
            anchor: outward > 0 ? 'end' : 'start',
            rotate: axis.labelRotation,
          });
        } else if (horizontal) {
          label = text(tick.label, {
            x: at,
            y: outward > 0 ? labelAt + font.tick : labelAt,
            size: font.tick,
            color: chrome.textSubdued,
            anchor: 'middle',
          });
        } else {
          label = text(tick.label, {
            x: labelAt,
            y: centeredBaseline(at, font.tick),
            size: font.tick,
            color: chrome.textSubdued,
            anchor: outward > 0 ? 'start' : 'end',
          });
        }
        const category =
          axis.id === 'x'
            ? scene.categories.findIndex(({ x }) => x === tick.value)
            : -1;
        return el(
          'g',
          {
            'data-tick': String(tick.value),
            'data-category': category >= 0 ? category : undefined,
          },
          mark,
          label
        );
      })
    : [];
  const thickness = axisThickness(axis);
  const title =
    axis.title &&
    (horizontal
      ? text(axis.title, {
          x: (plot.left + plot.right) / 2,
          y: outward > 0 ? edge + thickness : edge - thickness + font.axisTitle,
          size: font.axisTitle,
          color: chrome.text,
          anchor: 'middle',
        })
      : text(axis.title, {
          x:
            outward > 0
              ? edge + thickness - font.axisTitle * 0.2
              : edge - thickness + font.axisTitle,
          y: (plot.top + plot.bottom) / 2,
          size: font.axisTitle,
          color: chrome.text,
          anchor: 'middle',
          rotate: outward > 0 ? 90 : -90,
        }));
  return el('g', { 'data-axis': axis.id }, line, ticks, title);
};

const drawGrid = (
  scene: XyScene,
  axis: SceneAxis,
  scale: PixelScale,
  plot: Box
): SvgElement[] =>
  axis.showGrid
    ? axis.ticks.map((tick) => {
        const at = px(scale(tick.value));
        return isHorizontal(axis)
          ? el('line', {
              x1: at,
              x2: at,
              y1: px(plot.top),
              y2: px(plot.bottom),
              stroke: scene.chrome.gridLine,
              'stroke-width': theme.gridStrokeWidth,
            })
          : el('line', {
              x1: px(plot.left),
              x2: px(plot.right),
              y1: at,
              y2: at,
              stroke: scene.chrome.gridLine,
              'stroke-width': theme.gridStrokeWidth,
            });
      })
    : [];

// ---- Series ---------------------------------------------------------------

interface Projector {
  readonly x: PixelScale;
  readonly value: (axis: 'y' | 'y2') => PixelScale;
  readonly baseline: (axis: 'y' | 'y2') => number;
  /** Screen point for a position along the x axis and along a value axis. */
  readonly point: (along: number, across: number) => [number, number];
  readonly xHorizontal: boolean;
}

interface Fitted {
  readonly mark: XyMark;
  /** The value drawn: the mark's own, or one a fitting function filled in. */
  readonly y: number;
  readonly fitted: boolean;
}

const fill = (series: XySeries): (Fitted | null)[] => {
  const { marks, fitting } = series;
  const known = marks
    .map((mark, index) => ({ mark, index }))
    .filter(({ mark }) => mark.y !== null);
  return marks.map((mark, index) => {
    if (mark.y !== null) {
      return { mark, y: mark.y, fitted: false };
    }
    const before = [...known].reverse().find((entry) => entry.index < index);
    const after = known.find((entry) => entry.index > index);
    const value = (() => {
      if (!before || !after) {
        const near = before ?? after;
        if (fitting.extend === 'zero') {
          return 0;
        }
        return fitting.extend === 'nearest' && near ? near.mark.y : null;
      }
      const a = before.mark.y as number;
      const b = after.mark.y as number;
      switch (fitting.kind) {
        case 'none':
          return null;
        case 'zero':
          return 0;
        case 'carry':
          return a;
        case 'lookahead':
          return b;
        case 'average':
          return (a + b) / 2;
        case 'nearest':
          return index - before.index <= after.index - index ? a : b;
        case 'linear':
          return (
            a +
            ((b - a) * (index - before.index)) / (after.index - before.index)
          );
      }
    })();
    return value === null ? null : { mark, y: value, fitted: true };
  });
};

const pathThrough = (
  points: readonly [number, number][],
  interpolation: XySeries['interpolation'],
  xHorizontal: boolean
): string => {
  if (points.length === 0) {
    return '';
  }
  const [first, ...rest] = points;
  let d = `M${px(first![0])},${px(first![1])}`;
  if (interpolation === 'stepped') {
    for (const point of rest) {
      d += xHorizontal
        ? `H${px(point[0])}V${px(point[1])}`
        : `V${px(point[1])}H${px(point[0])}`;
    }
    return d;
  }
  if (interpolation === 'smooth' && points.length > 2) {
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]!;
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const p3 = points[Math.min(points.length - 1, i + 2)]!;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${px(c1[0]!)},${px(c1[1]!)} ${px(c2[0]!)},${px(c2[1]!)} ${px(p2[0])},${px(p2[1])}`;
    }
    return d;
  }
  return d + rest.map(([x, y]) => `L${px(x)},${px(y)}`).join('');
};

/** Consecutive drawn points, split where nothing is drawn. */
const runsOf = (filled: (Fitted | null)[]): Fitted[][] =>
  filled
    .reduce<Fitted[][]>(
      (runs, entry) => {
        if (entry === null) {
          if (runs[runs.length - 1]!.length > 0) {
            runs.push([]);
          }
        } else {
          runs[runs.length - 1]!.push(entry);
        }
        return runs;
      },
      [[]]
    )
    .filter((run) => run.length > 0);

/** A transparent target that takes gestures for a mark drawn without its own shape. */
const hitTarget = (cx: number, cy: number, hit: string) =>
  el('circle', {
    cx: px(cx),
    cy: px(cy),
    r: theme.hitRadius,
    fill: '#000000',
    'fill-opacity': 0,
    'data-hit': hit,
  });

const drawLineOrArea = (
  scene: XyScene,
  series: XySeries,
  project: Projector,
  interactive: boolean,
  emphasized: (mark: XyMark) => boolean
): SvgElement => {
  const seriesIndex = scene.series.indexOf(series);
  const hitOf = (mark: XyMark) =>
    `${seriesIndex}:${series.marks.indexOf(mark)}`;
  const value = project.value(series.axis);
  const at = (entry: Fitted, y: number) =>
    project.point(project.x(entry.mark.x), value(y));
  const runs = runsOf(fill(series));
  const fittedDash = series.fitting.emphasize ? theme.fittedDash : undefined;
  const parts: SvgElement[] = [];
  for (const run of runs) {
    const top = run.map((entry) => at(entry, entry.y));
    if (series.mark === 'area') {
      const bottom = run
        .map((entry) =>
          at(entry, entry.mark.y0 ?? project.baseline(series.axis))
        )
        .reverse();
      parts.push(
        el('path', {
          d: `${pathThrough(top, series.interpolation, project.xHorizontal)}${pathThrough(bottom, series.interpolation, project.xHorizontal).replace(/^M/, 'L')}Z`,
          fill: series.color,
          'fill-opacity': series.areaOpacity,
          stroke: 'none',
        })
      );
    }
    // Real segments solid; any segment touching a fitted value in the fitted style.
    let segment: [number, number][] = [];
    let segmentFitted = false;
    const flush = () => {
      if (segment.length > 1) {
        parts.push(
          el('path', {
            d: pathThrough(segment, series.interpolation, project.xHorizontal),
            fill: 'none',
            stroke: series.color,
            'stroke-width': theme.lineWidth,
            'stroke-dasharray': segmentFitted ? fittedDash : undefined,
            'stroke-linejoin': 'round',
            'data-series-path': seriesIndex,
          })
        );
      }
    };
    run.forEach((entry, index) => {
      const point = top[index]!;
      const fittedStep = index > 0 && (entry.fitted || run[index - 1]!.fitted);
      if (index > 0 && fittedStep !== segmentFitted) {
        flush();
        segment = [top[index - 1]!];
        segmentFitted = fittedStep;
      }
      segment.push(point);
    });
    flush();
    run.forEach((entry, index) => {
      if (entry.fitted) {
        return;
      }
      const [cx, cy] = top[index]!;
      const emphasis = emphasized(entry.mark);
      if (!(series.showPoints || run.length === 1 || emphasis)) {
        if (interactive) {
          parts.push(hitTarget(cx, cy, hitOf(entry.mark)));
        }
        return;
      }
      parts.push(
        el('circle', {
          cx: px(cx),
          cy: px(cy),
          r: emphasis ? theme.emphasisRadius : theme.pointRadius,
          fill: scene.chrome.background,
          stroke: emphasis ? scene.chrome.text : series.color,
          'stroke-width': theme.lineWidth,
          'data-hit': hitOf(entry.mark),
          'fill-opacity': entry.mark.partial ? theme.partialOpacity : undefined,
          'stroke-opacity': entry.mark.partial
            ? theme.partialOpacity
            : undefined,
          'data-row': entry.mark.source.rows.join(' '),
        })
      );
    });
  }
  return el(
    'g',
    { 'data-series': series.key, 'data-mark': series.mark },
    parts
  );
};

/** Width of one bar slot along the x axis, before it is split between bar groups. */
const barSlot = (
  bars: readonly XySeries[],
  project: Projector,
  plotExtent: number
): number => {
  if (project.x.bandwidth > 0) {
    return project.x.bandwidth * (1 - theme.bandPadding);
  }
  const positions = [
    ...new Set(bars.flatMap(({ marks }) => marks.map(({ x }) => project.x(x)))),
  ].sort((a, b) => a - b);
  const gaps = positions
    .slice(1)
    .map((position, index) => position - positions[index]!)
    .filter((gap) => gap > 0);
  return gaps.length > 0
    ? Math.min(...gaps) * (1 - theme.bandPadding)
    : plotExtent * theme.loneBarWidth;
};

const drawBars = (
  scene: XyScene,
  bars: readonly XySeries[],
  project: Projector,
  plotExtent: number,
  emphasized: (mark: XyMark) => boolean
): Map<XySeries, SvgElement> => {
  const groups = [
    ...new Set(bars.map((series) => series.stack?.group ?? series.key)),
  ];
  const slot = barSlot(bars, project, plotExtent);
  const width = slot / Math.max(groups.length, 1);
  return new Map(
    bars.map((series) => {
      const group = groups.indexOf(series.stack?.group ?? series.key);
      const offset = -slot / 2 + group * width;
      const value = project.value(series.axis);
      const seriesIndex = scene.series.indexOf(series);
      const rects = series.marks.flatMap((mark, markIndex) => {
        if (mark.y === null) {
          return [];
        }
        const along = project.x(mark.x) + offset;
        let from = value(mark.y0 ?? project.baseline(series.axis));
        let to = value(mark.y);
        if (
          Math.abs(to - from) < scene.barMinimumHeight &&
          mark.y !== (mark.y0 ?? 0)
        ) {
          const direction = Math.sign(to - from) || -1;
          to = from + direction * scene.barMinimumHeight;
        }
        [from, to] = [Math.min(from, to), Math.max(from, to)];
        const [x, y, w, h] = project.xHorizontal
          ? [along, from, width, to - from]
          : [from, along, to - from, width];
        return [
          el('rect', {
            x: px(x),
            y: px(y),
            width: px(w),
            height: px(h),
            fill: series.color,
            'fill-opacity': mark.partial ? theme.partialOpacity : undefined,
            stroke: emphasized(mark) ? scene.chrome.text : undefined,
            'stroke-width': emphasized(mark) ? theme.emphasisStroke : undefined,
            'data-row': mark.source.rows.join(' '),
            'data-hit': `${seriesIndex}:${markIndex}`,
          }),
        ];
      });
      return [
        series,
        el('g', { 'data-series': series.key, 'data-mark': 'bar' }, rects),
      ];
    })
  );
};

const drawValueLabels = (
  scene: XyScene,
  series: XySeries,
  project: Projector
): SvgElement[] => {
  if (!series.valueLabels) {
    return [];
  }
  const value = project.value(series.axis);
  return series.marks.flatMap((mark) => {
    if (mark.y === null) {
      return [];
    }
    const [x, y] = project.point(project.x(mark.x), value(mark.y));
    return [
      text(mark.label, {
        x: project.xHorizontal ? x : x + theme.tickGap,
        y: project.xHorizontal
          ? y - theme.tickGap
          : centeredBaseline(y, font.valueLabel),
        size: font.valueLabel,
        color: scene.chrome.text,
        anchor: project.xHorizontal ? 'middle' : 'start',
      }),
    ];
  });
};

// ---- Helper marks ---------------------------------------------------------

const DASH = theme.dash;

const drawReferenceLine = (
  line: SceneReferenceLine,
  scales: Partial<Record<'x' | 'y' | 'y2', PixelScale>>,
  axes: Partial<Record<'x' | 'y' | 'y2', SceneAxis>>,
  plot: Box
): SvgElement | null => {
  const scale = scales[line.axis];
  const axis = axes[line.axis];
  if (!scale || !axis) {
    return null;
  }
  const at = scale(line.value);
  const horizontalAxis = isHorizontal(axis);
  // Above means toward larger values: right on a horizontal axis, up on a vertical one.
  const fill =
    line.fill &&
    (horizontalAxis
      ? line.fill === 'above'
        ? [at, plot.top, plot.right - at, plot.bottom - plot.top]
        : [plot.left, plot.top, at - plot.left, plot.bottom - plot.top]
      : line.fill === 'above'
        ? [plot.left, plot.top, plot.right - plot.left, at - plot.top]
        : [plot.left, at, plot.right - plot.left, plot.bottom - at]);
  const stroke = horizontalAxis
    ? { x1: at, x2: at, y1: plot.top, y2: plot.bottom }
    : { x1: plot.left, x2: plot.right, y1: at, y2: at };
  const labelAnchor = line.textPosition === 'left' ? 'start' : 'end';
  return el(
    'g',
    { 'data-part': 'reference-line' },
    fill &&
      el('rect', {
        x: px(fill[0]!),
        y: px(fill[1]!),
        width: px(Math.max(0, fill[2]!)),
        height: px(Math.max(0, fill[3]!)),
        fill: line.color,
        'fill-opacity': theme.referenceFillOpacity,
      }),
    el('line', {
      x1: px(stroke.x1),
      x2: px(stroke.x2),
      y1: px(stroke.y1),
      y2: px(stroke.y2),
      stroke: line.color,
      'stroke-width': line.strokeWidth,
      'stroke-dasharray': DASH[line.strokeDash],
    }),
    line.label &&
      text(line.label, {
        x: horizontalAxis
          ? at + theme.tickGap
          : labelAnchor === 'start'
            ? plot.left + theme.tickGap
            : plot.right - theme.tickGap,
        y: horizontalAxis ? plot.top + font.tick : at - theme.tickGap,
        size: font.tick,
        color: line.color,
        anchor: horizontalAxis ? 'start' : labelAnchor,
      })
  );
};

const drawAnnotation = (
  annotation: SceneAnnotation,
  x: PixelScale,
  xHorizontal: boolean,
  plot: Box
): SvgElement => {
  const span = (from: number, to: number) => {
    const [a, b] = [Math.min(from, to), Math.max(from, to)];
    return xHorizontal
      ? { x: a, y: plot.top, width: b - a, height: plot.bottom - plot.top }
      : { x: plot.left, y: a, width: plot.right - plot.left, height: b - a };
  };
  const rect = (box: ReturnType<typeof span>) =>
    el('rect', {
      x: px(box.x),
      y: px(box.y),
      width: px(Math.max(0, box.width)),
      height: px(Math.max(0, box.height)),
      fill: annotation.color,
      'fill-opacity': theme.annotationRangeOpacity,
    });
  const labelAt = (position: number) =>
    annotation.label
      ? text(annotation.label, {
          x: xHorizontal ? position + theme.tickGap : plot.left + theme.tickGap,
          y: xHorizontal ? plot.top + font.tick : position - theme.tickGap,
          size: font.tick,
          color: annotation.color,
        })
      : null;
  if (annotation.kind === 'range') {
    const from = x(annotation.from);
    const to = x(annotation.to);
    const [start, end] = xHorizontal
      ? [plot.left, plot.right]
      : [plot.top, plot.bottom];
    const boxes =
      annotation.fill === 'inside'
        ? [span(from, to)]
        : [span(start, Math.min(from, to)), span(Math.max(from, to), end)];
    return el(
      'g',
      { 'data-part': 'annotation' },
      boxes.map(rect),
      labelAt(Math.min(from, to))
    );
  }
  const at = x(annotation.at);
  const line = annotation.line ?? {
    width: theme.annotationLineWidth,
    dash: 'solid' as const,
  };
  return el(
    'g',
    { 'data-part': 'annotation' },
    el('line', {
      ...(xHorizontal
        ? { x1: px(at), x2: px(at), y1: px(plot.top), y2: px(plot.bottom) }
        : { x1: px(plot.left), x2: px(plot.right), y1: px(at), y2: px(at) }),
      stroke: annotation.color,
      'stroke-width': line.width,
      'stroke-dasharray': DASH[line.dash],
    }),
    labelAt(at)
  );
};

// ---- Scene ----------------------------------------------------------------

/** The size an xy Scene draws at. */
export const xySize = (scene: XyScene): SceneSize =>
  scene.size ?? SVG_THEME.defaultSize.xy;

/** Where an xy Scene's parts go: the plot box and the pixel scales. */
export interface XyLayout {
  readonly size: SceneSize;
  readonly outer: Box;
  readonly plot: Box;
  readonly scales: Readonly<Partial<Record<'x' | 'y' | 'y2', PixelScale>>> & {
    readonly x: PixelScale;
  };
  readonly xHorizontal: boolean;
}

interface FullLayout extends XyLayout {
  readonly legendLayout: LegendLayout;
  readonly axes: SceneAxis[];
  readonly project: Projector;
}

const layout = (scene: XyScene): FullLayout => {
  const size = xySize(scene);
  const outer: Box = {
    left: theme.padding,
    top: theme.padding,
    right: size.width - theme.padding,
    bottom: size.height - theme.padding,
  };
  const legendLayout = layoutLegend(scene.legend, outer.right - outer.left);
  const axes = axesOf(scene);
  const reserve = { left: 0, right: 0, top: 0, bottom: 0 };
  for (const axis of axes) {
    reserve[axis.position] += axisThickness(axis);
  }
  for (const [side, amount] of Object.entries(legendLayout.reserve)) {
    reserve[side as keyof typeof reserve] += amount ?? 0;
  }
  // Leave room for the last horizontal tick label to overhang the plot.
  const overhang = Math.max(
    0,
    ...axes
      .filter((axis) => isHorizontal(axis) && axis.labelRotation === 0)
      .map((axis) => textWidth(axis.ticks.at(-1)?.label ?? '', font.tick) / 2)
  );
  const plot: Box = {
    left: outer.left + reserve.left,
    top: outer.top + reserve.top,
    right:
      outer.right - Math.max(reserve.right, reserve.right === 0 ? overhang : 0),
    bottom: outer.bottom - reserve.bottom,
  };
  const scaleOf = (axis: SceneAxis) =>
    isHorizontal(axis)
      ? scaleFor(axis, plot.left, plot.right)
      : axis.scale === 'ordinal'
        ? scaleFor(axis, plot.top, plot.bottom)
        : scaleFor(axis, plot.bottom, plot.top);
  const scales = {
    x: scaleOf(scene.axes.x),
    ...(scene.axes.y && { y: scaleOf(scene.axes.y) }),
    ...(scene.axes.y2 && { y2: scaleOf(scene.axes.y2) }),
  };
  const xHorizontal = isHorizontal(scene.axes.x);
  const project: Projector = {
    x: scales.x,
    value: (axis) => scales[axis] ?? scales.y ?? scales.y2 ?? scales.x,
    baseline: (axis) => {
      const sceneAxis = scene.axes[axis] ?? scene.axes.y ?? scene.axes.y2;
      return sceneAxis ? baselineOf(sceneAxis) : 0;
    },
    point: (along, across) => (xHorizontal ? [along, across] : [across, along]),
    xHorizontal,
  };
  return {
    size,
    outer,
    plot,
    scales,
    xHorizontal,
    legendLayout,
    axes,
    project,
  };
};

/** The layout {@link drawXy} draws `scene` with. */
export const layoutXy = (scene: XyScene): XyLayout => layout(scene);

export interface DrawOptions {
  /** Adds hit targets for gestures: one per line or area mark, and the plot. */
  readonly interactive?: boolean;
}

export const drawXy = (
  scene: XyScene,
  { interactive = false }: DrawOptions = {}
): SvgElement => {
  const {
    size,
    outer,
    plot,
    scales,
    xHorizontal,
    legendLayout,
    axes,
    project,
  } = layout(scene);
  const hidden = new Set(
    scene.legend.items.filter(({ hidden }) => hidden).map(({ key }) => key)
  );
  const visible = scene.series.filter(({ key }) => !hidden.has(key));
  const emphasisRows = new Set(
    scene.interactions.emphasis.flatMap(({ rows }) => rows)
  );
  const emphasized = (mark: XyMark) =>
    mark.source.rows.some((row) => emphasisRows.has(row));
  const bars = drawBars(
    scene,
    visible.filter(({ mark }) => mark === 'bar'),
    project,
    xHorizontal ? plot.right - plot.left : plot.bottom - plot.top,
    emphasized
  );
  const axisById = {
    x: scene.axes.x,
    ...(scene.axes.y && { y: scene.axes.y }),
    ...(scene.axes.y2 && { y2: scene.axes.y2 }),
  };
  const lines = scene.referenceLines.map((line) =>
    drawReferenceLine(line, scales, axisById, plot)
  );
  return root(
    scene,
    size,
    el(
      'g',
      { 'data-part': 'grid' },
      axes.flatMap((axis) =>
        drawGrid(scene, axis, scales[axis.id as 'x'] ?? scales.x, plot)
      )
    ),
    interactive &&
      el('rect', {
        x: px(plot.left),
        y: px(plot.top),
        width: px(plot.right - plot.left),
        height: px(plot.bottom - plot.top),
        fill: '#000000',
        'fill-opacity': 0,
        'data-plot': '',
      }),
    scene.annotations
      .filter(({ kind }) => kind === 'range')
      .map((annotation) =>
        drawAnnotation(annotation, scales.x, xHorizontal, plot)
      ),
    el(
      'g',
      { 'data-part': 'series' },
      visible.map((series) =>
        series.mark === 'bar'
          ? bars.get(series)!
          : drawLineOrArea(scene, series, project, interactive, emphasized)
      )
    ),
    lines,
    scene.annotations
      .filter(({ kind }) => kind === 'point')
      .map((annotation) =>
        drawAnnotation(annotation, scales.x, xHorizontal, plot)
      ),
    scene.currentTime !== undefined &&
      el('line', {
        'data-part': 'current-time',
        ...(xHorizontal
          ? {
              x1: px(scales.x(scene.currentTime)),
              x2: px(scales.x(scene.currentTime)),
              y1: px(plot.top),
              y2: px(plot.bottom),
            }
          : {
              x1: px(plot.left),
              x2: px(plot.right),
              y1: px(scales.x(scene.currentTime)),
              y2: px(scales.x(scene.currentTime)),
            }),
        stroke: scene.chrome.text,
        'stroke-width': theme.annotationLineWidth,
        'stroke-dasharray': theme.currentTimeDash,
      }),
    axes.map((axis) =>
      drawAxis(scene, axis, scales[axis.id as 'x'] ?? scales.x, plot)
    ),
    el(
      'g',
      { 'data-part': 'value-labels' },
      visible.flatMap((series) => drawValueLabels(scene, series, project))
    ),
    drawLegend(scene, legendLayout, outer, plot)
  );
};
