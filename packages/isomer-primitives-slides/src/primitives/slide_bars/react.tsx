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
import { bars as theme, barsFit } from '../../theme/components/bars';
import { layoutModule } from '../../theme/modules';
import { sizeForLoad } from '../size';

import type { SlideBarsNode } from './schema';
import { barsModule } from './styles';

const maxShare = parseFloat(theme.barMaxShare.value);

/** The value a full-length bar stands for: `max`, else the largest value, else 1 when every value is 0. */
const barsMax = ({ items, max }: SlideBarsNode): number =>
  (max ?? Math.max(...items.map(({ value }) => value))) || 1;

/** React renderer for {@link SlideBarsNode}. */
export const react = (
  node: SlideBarsNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { type, items, size } = node;
  const { handles: bars } = barsModule;
  const step = sizeForLoad(
    size,
    2 * items.length + items.filter(({ detail }) => detail).length,
    barsFit,
    context?.crowding
  );
  const max = barsMax(node);
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <ul className={cls(context, bars.list, bars.rowGap[step])}>
        {items.map(({ label, value, detail, highlight }, index) => (
          <li className={cls(context, bars.row)} key={index}>
            <span className={cls(context, bars.label, bars.labelSize[step])}>
              {marksReact(label, context, 'primary')}
            </span>
            <div className={cls(context, bars.measure, bars.detailGap[step])}>
              <div className={cls(context, bars.line)}>
                <div
                  className={cls(
                    context,
                    bars.bar,
                    bars.barHeight[step],
                    highlight ? bars.barHighlight : undefined
                  )}
                  style={{ width: `${(value / max) * maxShare}%` }}
                />
                <span
                  className={cls(
                    context,
                    bars.value,
                    bars.valueSize[step],
                    highlight ? bars.valueHighlight : undefined
                  )}>
                  {String(value)}
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
