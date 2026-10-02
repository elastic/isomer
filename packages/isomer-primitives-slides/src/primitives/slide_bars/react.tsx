/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { marksReact } from '../../render/marks';
import { ToneCue } from '../../render/tone_cue';
import { bars as theme, barsFit } from '../../theme/components/bars';
import { tone } from '../../theme/components/shared';
import { layoutModule } from '../../theme/modules';
import { scalePx } from '../../theme/scale';
import type { TypeRole } from '../../theme/type_role';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import {
  measureMarks,
  measureText,
  sizeForLoad,
  sizeForWidth,
  smallerStep,
} from '../size';

import type { SlideBarsItem, SlideBarsNode } from './schema';
import { barsModule } from './styles';
import { barValue } from './value';

const maxShare = parseFloat(theme.barMaxShare.value);
const labelShare = parseFloat(theme.labelMaxShare.value) / 100;

/** The label column, `labelWidth` or `labelMaxShare` of a layout too narrow for it, and the track beside it. */
const barsColumns = (width: number): { column: number; track: number } => {
  const column = Math.min(
    scalePx(theme.labelWidth),
    Math.max(0, width) * labelShare
  );
  return { column, track: Math.max(0, width - column) };
};

/** `max`, else the largest value, else 1 when every value is 0. */
const barsMax = ({ items, max }: SlideBarsNode): number =>
  (max ?? Math.max(...items.map(({ value }) => value))) || 1;

const cueWidth = scalePx(tone.cue.size) + scalePx(tone.cue.gap);

const lines = (
  marked: string,
  role: TypeRole,
  width: number,
  strong?: 'primary'
): number => Math.max(1, measureMarks(marked, role, width, strong).lines);

/** Two per label line, since a label line is a bar tall, and one per detail line under the bar. */
const rowsLoad =
  (items: readonly SlideBarsItem[], column: number, track: number) =>
  (step: SlideSize) =>
    items.reduce(
      (load, { label, detail, highlight }) =>
        load +
        2 *
          lines(
            label,
            { ...theme.label, size: theme.labelSizes[step] },
            column - (highlight ? cueWidth : 0),
            'primary'
          ) +
        (detail ? lines(detail, theme.detail, track) : 0),
      0
    );

/** The smallest of the step the rows' load takes under `crowding` and those at which each value fits beside its bar across `width`. */
export const barsSize = (
  node: SlideBarsNode,
  { width, crowding }: { width: number; crowding: number }
): SlideSize => {
  const { items, size } = node;
  const { column, track } = barsColumns(width);
  const max = barsMax(node);
  const barMin = scalePx(theme.barMinWidth);
  return items.reduce<SlideSize>(
    (worst, { value }) =>
      smallerStep(
        worst,
        sizeForWidth(
          size,
          barValue(value),
          theme.value,
          track -
            (value > 0
              ? Math.max((track * (value / max) * maxShare) / 100, barMin)
              : 0) -
            scalePx(theme.valueGap),
          theme.valueSizes
        )
      ),
    sizeForLoad(size, rowsLoad(items, column, track), barsFit, crowding)
  );
};

/** The percent of the track a bar at `max` draws at `step`: `barMaxShare`, less whatever keeps each value beside its bar. */
const barShare = (
  node: SlideBarsNode,
  track: number,
  step: SlideSize
): number => {
  const max = barsMax(node);
  const role = { ...theme.value, size: theme.valueSizes[step] };
  return Math.max(
    0,
    Math.min(
      maxShare,
      ...node.items
        .filter(({ value }) => value > 0)
        .map(
          ({ value }) =>
            ((track -
              scalePx(theme.valueGap) -
              measureText(barValue(value), role).widest) /
              Math.max(1, track)) *
            100 *
            (max / value)
        )
    )
  );
};

/** React renderer for {@link SlideBarsNode}. */
export const react = (
  node: SlideBarsNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { type, items } = node;
  const { handles: bars } = barsModule;
  const layout = slideLayout(context);
  const step = barsSize(node, layout);
  const max = barsMax(node);
  const { column, track } = barsColumns(layout.width);
  const share = barShare(node, track, step);
  const columns = `${Number(column.toFixed(2))}px minmax(0, 1fr)`;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <ul className={cls(context, bars.list, bars.rowGap[step])}>
        {items.map(({ label, value, detail, highlight }, index) => (
          <li
            className={cls(context, bars.row)}
            key={index}
            style={{ gridTemplateColumns: columns }}>
            <span className={cls(context, bars.label, bars.labelSize[step])}>
              {highlight ? <ToneCue tone="primary" {...{ context }} /> : null}
              {marksReact(label, context, 'primary')}
            </span>
            <div className={cls(context, bars.measure, bars.detailGap[step])}>
              <div className={cls(context, bars.line)}>
                <div
                  aria-hidden
                  className={cls(
                    context,
                    bars.bar,
                    bars.barHeight[step],
                    value > 0 ? bars.barPositive : undefined,
                    highlight ? bars.barHighlighted : undefined
                  )}
                  style={{
                    width: `${Number(((value / max) * share).toFixed(4))}%`,
                  }}
                />
                <span
                  className={cls(
                    context,
                    bars.value,
                    bars.valueSize[step],
                    highlight ? bars.valueHighlighted : undefined
                  )}>
                  {barValue(value)}
                </span>
              </div>
              {detail ? (
                <span className={cls(context, bars.detail)}>
                  {marksReact(detail, context)}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
