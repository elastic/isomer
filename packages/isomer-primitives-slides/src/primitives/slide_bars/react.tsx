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
import { marksReact, stripMarks } from '../../render/marks';
import { ToneCue } from '../../render/tone_cue';
import { bars as theme, barsFit } from '../../theme/components/bars';
import { tone } from '../../theme/components/shared';
import { layoutModule } from '../../theme/modules';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import {
  emWidth,
  monoLines,
  sizeForLoad,
  sizeForWidth,
  smallerStep,
  wrappedLines,
} from '../size';

import type { SlideBarsItem, SlideBarsNode } from './schema';
import { barsModule } from './styles';
import { barValue } from './value';

const maxShare = parseFloat(theme.barMaxShare.value);

/** `max`, else the largest value, else 1 when every value is 0. */
const barsMax = ({ items, max }: SlideBarsNode): number =>
  (max ?? Math.max(...items.map(({ value }) => value))) || 1;

const cueWidth = scalePx(tone.cue.size) + scalePx(tone.cue.gap);

/** Two per label line, since a label line is a bar tall, and one per detail line under the bar. */
const rowsLoad =
  (items: readonly SlideBarsItem[], track: number) => (step: SlideSize) =>
    items.reduce(
      (load, { label, detail, highlight }) =>
        load +
        2 *
          wrappedLines(
            stripMarks(label),
            scalePx(theme.labelSizes[step]),
            scalePx(theme.labelWidth) - (highlight ? cueWidth : 0),
            theme.label.tracking
          ) +
        (detail
          ? monoLines(stripMarks(detail), scalePx(theme.detail.size), track)
          : 0),
      0
    );

/** The smallest of the step the rows' load takes under `crowding` and those at which each value fits beside its bar across `width`. */
export const barsSize = (
  node: SlideBarsNode,
  { width, crowding }: { width: number; crowding: number }
): SlideSize => {
  const { items, size } = node;
  const track = width - scalePx(theme.labelWidth);
  const max = barsMax(node);
  return items.reduce<SlideSize>(
    (worst, { value }) =>
      smallerStep(
        worst,
        sizeForWidth(
          size,
          emWidth(barValue(value), theme.value.tracking),
          track * (1 - ((value / max) * maxShare) / 100) -
            scalePx(theme.valueGap),
          theme.valueSizes
        )
      ),
    sizeForLoad(size, rowsLoad(items, track), barsFit, crowding)
  );
};

/** React renderer for {@link SlideBarsNode}. */
export const react = (
  node: SlideBarsNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { type, items } = node;
  const { handles: bars } = barsModule;
  const step = barsSize(node, slideLayout(context));
  const max = barsMax(node);
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <ul className={cls(context, bars.list, bars.rowGap[step])}>
        {items.map(({ label, value, detail, highlight }, index) => (
          <li className={cls(context, bars.row)} key={index}>
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
                    highlight ? bars.barHighlighted : undefined
                  )}
                  style={{
                    width: `${Number(((value / max) * maxShare).toFixed(4))}%`,
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
