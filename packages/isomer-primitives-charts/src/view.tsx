/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { nodeAnchor, type PrimitiveNode } from '@elastic/isomer-sdk';

import {
  alignMetricTrends,
  compareMetric,
  formatMetricValue,
  metricText,
  type MetricTile,
  metricTileColor,
  metricTiles,
  metricTimeLabel,
  type MetricTrendModel,
} from './model';
import {
  CHART_THEME,
  type ChartsRenderContext,
  type ChartsTheme,
  chartsThemes,
  metricContrast,
} from './theme';

export type MetricTrendNode = MetricTrendModel & PrimitiveNode;

export function MetricDataTable({
  tile,
  locale,
}: {
  tile: MetricTile;
  locale?: string | undefined;
}) {
  if (!tile.trend) {
    return null;
  }
  const cell = {
    padding: CHART_THEME.tile.compactPadding,
    textAlign: 'left' as const,
    borderBottom: `${CHART_THEME.tile.border}px solid currentColor`,
  };
  const formatted = (value: number, reading: MetricTile['primary']) =>
    formatMetricValue(value, {
      ...reading.format,
      locale: reading.format?.locale ?? locale ?? 'en-US',
    });
  return (
    <table
      style={{
        borderCollapse: 'collapse',
        width: '100%',
        fontSize: CHART_THEME.font.secondary,
      }}>
      <caption>
        Trend data: {tile.title ?? tile.primary.label} (
        {tile.trend.timeZone ?? 'UTC'}; gaps: {tile.trend.gap ?? 'gap'})
      </caption>
      <thead>
        <tr>
          <th scope="col" style={cell}>
            Time
          </th>
          <th scope="col" style={cell}>
            {tile.primary.label}
          </th>
          {tile.trend.secondary ? (
            <th scope="col" style={cell}>
              {tile.secondary!.label}
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {alignMetricTrends(tile.trend).map((p) => (
          <tr key={p.time}>
            <th scope="row" style={cell}>
              {metricTimeLabel(p.time, tile.trend!.timeZone, locale)}
            </th>
            <td style={cell}>
              {p.primary === null ? 'gap' : formatted(p.primary, tile.primary)}
            </td>
            {tile.trend!.secondary ? (
              <td style={cell}>
                {p.secondary === null
                  ? 'gap'
                  : formatted(p.secondary, tile.secondary!)}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Trend({ tile, theme }: { tile: MetricTile; theme: ChartsTheme }) {
  if (!tile.trend) {
    return null;
  }
  const points = alignMetricTrends(tile.trend);
  const all = points
    .flatMap((p) => [p.primary, p.secondary])
    .filter((v): v is number => v !== null);
  if (!all.length) {
    return <p>No trend readings</p>;
  }
  const t = CHART_THEME.trend;
  const zero = tile.trend.gap === 'zero';
  const baseline =
    zero || tile.trend.shape === 'area' || tile.trend.shape === 'bars';
  const min = Math.min(...all, ...(baseline ? [0] : []));
  const max = Math.max(...all, ...(baseline ? [0] : []));
  const first = points[0]!.time;
  const last = points[points.length - 1]!.time;
  const inset =
    tile.trend.shape === 'bars'
      ? ((t.width - t.padding * 2) / points.length) * t.barRatio
      : 0;
  const x = (time: number) =>
    t.padding +
    inset +
    ((time - first) / (last - first || 1)) *
      (t.width - t.padding * 2 - inset * 2);
  const y = (value: number) =>
    t.height -
    t.padding -
    (max === min ? 0.5 : (value - min) / (max - min)) *
      (t.height - t.padding * 2);
  return (
    <svg
      role="img"
      aria-label={`${tile.primary.label} over time${tile.trend.secondary ? ` and ${tile.secondary!.label}` : ''}; ${tile.trend.gap ?? 'gap'} policy`}
      viewBox={`0 0 ${t.width} ${t.height}`}
      width="100%"
      height={t.height}
      style={{ background: theme.background }}>
      {(['primary', 'secondary'] as const).map((name) => {
        if (name === 'secondary' && !tile.trend!.secondary) {
          return null;
        }
        const paint = name === 'primary' ? theme.accent : theme.secondary;
        const segments: { time: number; value: number }[][] = [[]];
        for (const point of points) {
          const value = point[name] ?? (zero ? 0 : null);
          if (value === null) {
            if (
              tile.trend!.gap !== 'connect' &&
              segments[segments.length - 1]!.length
            ) {
              segments.push([]);
            }
            continue;
          }
          segments[segments.length - 1]!.push({ time: point.time, value });
        }
        if (tile.trend!.shape === 'bars') {
          const barWidth =
            (((t.width - t.padding * 2) / points.length) * t.barRatio) /
            (tile.trend!.secondary ? 2 : 1);
          return (
            <g key={name}>
              {segments.flat().map((p) => (
                <rect
                  key={p.time}
                  x={
                    x(p.time) +
                    (name === 'secondary'
                      ? 0
                      : -barWidth / (tile.trend!.secondary ? 1 : 2))
                  }
                  y={Math.min(y(p.value), y(0))}
                  width={barWidth}
                  height={Math.abs(y(p.value) - y(0))}
                  fill={paint}
                />
              ))}
            </g>
          );
        }
        return (
          <g key={name}>
            {segments
              .filter((s) => s.length)
              .map((segment, i) => {
                const path = segment
                  .map(
                    (p, index) =>
                      `${index ? 'L' : 'M'}${x(p.time)},${y(p.value)}`
                  )
                  .join(' ');
                return (
                  <g key={i}>
                    {segment.length === 1 ? (
                      <circle
                        cx={x(segment[0]!.time)}
                        cy={y(segment[0]!.value)}
                        r={t.pointRadius}
                        fill={paint}
                      />
                    ) : null}
                    {tile.trend!.shape === 'area' ? (
                      <path
                        d={`${path} L${x(segment[segment.length - 1]!.time)},${y(0)} L${x(segment[0]!.time)},${y(0)} Z`}
                        fill={paint}
                        fillOpacity={t.opacity}
                        stroke="none"
                      />
                    ) : null}
                    <path
                      d={path}
                      fill="none"
                      stroke={paint}
                      strokeWidth={t.stroke}
                    />
                  </g>
                );
              })}
          </g>
        );
      })}
    </svg>
  );
}

export interface MetricViewProps {
  node: MetricTrendNode;
  theme?: ChartsTheme | undefined;
  context?: ChartsRenderContext | undefined;
  renderTile?:
    ((tile: MetricTile, theme: ChartsTheme) => ReactNode) | undefined;
}

/** Shared React tree for baseline HTML, snapshots and the mounted browser renderer. */
export function MetricView({
  node,
  theme = chartsThemes.light,
  context = {},
  renderTile,
}: MetricViewProps) {
  const tokens = CHART_THEME;
  const tiles = metricTiles(node);
  const columns = Math.min(
    node.layout?.columns ?? 3,
    Math.max(tiles.length, node.layout?.minTiles ?? 1)
  );
  const reading = (r: MetricTile['primary']) =>
    r.formatted ??
    formatMetricValue(r.value, {
      ...r.format,
      locale: r.format?.locale ?? node.locale ?? 'en-US',
    });
  return (
    <figure
      {...nodeAnchor(context, node)}
      className="isomer-metric"
      aria-label={node.title}
      style={{
        margin: 0,
        color: theme.text,
        background: theme.background,
        fontFamily: tokens.fontFamily,
        lineHeight: tokens.font.lineHeight,
      }}>
      <figcaption
        style={{ fontSize: tokens.font.title, fontWeight: tokens.font.weight }}>
        {node.title}
      </figcaption>
      {node.description ? <p>{node.description}</p> : null}
      {node.collapse ? (
        <p>
          {node.collapse.operation} over {node.tiles.length} source tiles
        </p>
      ) : null}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: tokens.tile.gap,
        }}>
        {tiles.map((tile) => {
          const paint = metricTileColor(node, tile);
          const tileColor =
            paint.color ?? (paint.tone ? theme.tone[paint.tone] : theme.accent);
          const background =
            node.applyColorTo !== 'value' ? tileColor : theme.background;
          const foreground =
            node.applyColorTo !== 'value'
              ? metricContrast(tileColor)
              : theme.text;
          const compared = compareMetric(tile, node.locale);
          const secondary = tile.secondary;
          const position = node.layout?.primaryPosition ?? 'middle';
          const action = tile.action;
          return (
            <section
              key={tile.key}
              data-metric-key={tile.key}
              aria-label={tile.title ?? tile.primary.label}
              style={{
                minWidth: 0,
                overflowWrap: 'anywhere',
                border: `${tokens.tile.border}px solid ${theme.border}`,
                borderRadius: tokens.tile.radius,
                padding:
                  node.layout?.density === 'compact'
                    ? tokens.tile.compactPadding
                    : tokens.tile.padding,
                background,
                color: foreground,
              }}>
              {renderTile ? (
                renderTile(tile, theme)
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight:
                        node.layout?.density === 'compact'
                          ? tokens.tile.compactHeight
                          : tokens.tile.height,
                    }}>
                    <div
                      style={{
                        textAlign: node.layout?.titleAlign ?? 'left',
                        order: position === 'top' ? 1 : 0,
                      }}>
                      {tile.icon ? (
                        <span
                          style={{ float: node.layout?.iconAlign ?? 'left' }}>
                          {tile.icon}
                        </span>
                      ) : null}
                      <strong>{tile.title ?? tile.primary.label}</strong>
                      {tile.subtitle ? <div>{tile.subtitle}</div> : null}
                    </div>
                    <div
                      style={{
                        textAlign: node.layout?.primaryAlign ?? 'left',
                        fontSize:
                          node.layout?.valueFont === 'fit'
                            ? `clamp(${tokens.font.minimumValue}px, 5vw, ${tokens.font.value}px)`
                            : tokens.font.value,
                        fontWeight: tokens.font.weight,
                        order:
                          position === 'bottom'
                            ? 3
                            : position === 'top'
                              ? 0
                              : 1,
                        color:
                          node.applyColorTo === 'value'
                            ? tileColor
                            : foreground,
                      }}>
                      {reading(tile.primary)}
                    </div>
                    {secondary ? (
                      <div
                        style={{
                          textAlign: node.layout?.secondaryAlign ?? 'left',
                          fontSize: tokens.font.secondary,
                          order: 2,
                        }}>
                        <span
                          title={
                            secondary.labelPosition === 'tooltip'
                              ? secondary.label
                              : undefined
                          }>
                          {secondary.labelPosition !== 'hidden' &&
                          secondary.labelPosition !== 'tooltip' &&
                          secondary.labelPosition !== 'after'
                            ? `${secondary.label}: `
                            : null}
                          <span
                            style={{
                              ...(compared || secondary.color
                                ? {
                                    background:
                                      compared?.color ??
                                      secondary.color ??
                                      theme.tone[compared!.tone],
                                    color: metricContrast(
                                      compared?.color ??
                                        secondary.color ??
                                        theme.tone[compared!.tone]
                                    ),
                                  }
                                : { color: foreground }),
                            }}>
                            {compared &&
                            secondary.comparison?.visuals !== 'value'
                              ? `${tokens.glyph[compared.direction]} `
                              : null}
                            {secondary.comparison?.visuals !== 'icon'
                              ? (compared?.formatted ?? reading(secondary))
                              : null}
                          </span>
                          {secondary.labelPosition === 'after'
                            ? ` ${secondary.label}`
                            : null}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  {tile.progress ? (
                    <div>
                      <label>
                        {tile.progress.label ?? 'Progress'}:{' '}
                        {reading(tile.primary)} /{' '}
                        {reading({
                          ...tile.primary,
                          value: tile.progress.max,
                          formatted: undefined,
                        })}
                      </label>
                      {typeof tile.primary.value === 'number' ? (
                        <meter
                          aria-label={tile.progress.label ?? 'Progress'}
                          min={tile.progress.min ?? 0}
                          max={tile.progress.max}
                          value={tile.primary.value}
                          style={{
                            width: '100%',
                            writingMode:
                              tile.progress.direction === 'vertical'
                                ? 'vertical-rl'
                                : 'horizontal-tb',
                          }}
                        />
                      ) : (
                        <p>N/A</p>
                      )}
                    </div>
                  ) : null}
                  <Trend tile={tile} theme={theme} />
                </>
              )}
              {compared ? (
                <p style={{ fontSize: tokens.font.small }}>
                  {compared.description}
                </p>
              ) : null}
              {paint.tone ? (
                <p>
                  Status: {paint.tone}
                  {paint.label ? ` (${paint.label})` : ''}
                </p>
              ) : null}
              {action ? (
                context.onEvent ? (
                  <button
                    type="button"
                    onClick={() =>
                      context.onEvent?.({
                        name: action.event.name,
                        ...(action.event.context
                          ? { context: action.event.context }
                          : {}),
                      })
                    }>
                    {action.label}
                  </button>
                ) : (
                  <p>Action: {action.label} (requires host interaction)</p>
                )
              ) : null}
              {tile.trend ? (
                <details>
                  <summary>View trend data</summary>
                  <MetricDataTable tile={tile} locale={node.locale} />
                </details>
              ) : null}
            </section>
          );
        })}
        {Array.from(
          { length: Math.max(0, (node.layout?.minTiles ?? 0) - tiles.length) },
          (_, index) => (
            <div
              key={`empty-${index}`}
              aria-hidden="true"
              data-metric-empty=""
              style={{ minHeight: tokens.tile.height, background: theme.track }}
            />
          )
        )}
      </div>
      <details>
        <summary>Read metric summary</summary>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: tokens.fontFamily }}>
          {metricText(node)}
        </pre>
      </details>
    </figure>
  );
}
