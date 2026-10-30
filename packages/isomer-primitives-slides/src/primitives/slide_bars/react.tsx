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
import { layoutModule } from '../../theme/modules';
import { slideLayout } from '../layout';

import { barsColumns, barShare, barsMax, barsStep } from './fit';
import type { SlideBarsNode } from './schema';
import { barsModule } from './styles';
import { barValue } from './value';

/** React renderer for {@link SlideBarsNode}. */
export const react = (
  node: SlideBarsNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { type, items } = node;
  const { handles: bars } = barsModule;
  const layout = slideLayout(context);
  const step = barsStep(node, layout);
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
