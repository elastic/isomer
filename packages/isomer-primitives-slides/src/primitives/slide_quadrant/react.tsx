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
import { quadrantFit } from '../../theme/components/quadrant';
import { labelModule } from '../../theme/modules';
import { sizeForLoad } from '../size';

import type { SlideQuadrantNode } from './schema';
import { quadrantModule } from './styles';

const { handles: quadrant } = quadrantModule;

/** Border and caption placement for each cell, in schema order: TL, TR, BL, BR. */
const corners = [
  [quadrant.cellTop, quadrant.cellLeft],
  [quadrant.cellTop, quadrant.cellRight],
  [quadrant.cellBottom, quadrant.cellLeft],
  [quadrant.cellBottom, quadrant.cellRight],
] as const;

/** Where each cell's chips start: by its caption's corner. */
const itemCorners = [
  [],
  [quadrant.itemsRight],
  [quadrant.itemsBottom],
  [quadrant.itemsRight, quadrant.itemsBottom],
] as const;

/** React renderer for {@link SlideQuadrantNode}. */
export const react = (
  { type, x, y, quadrants, highlight, size }: SlideQuadrantNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { label } = labelModule.handles;
  const [tl, tr, bl, br] = quadrants.map(({ items }) => items.length);
  const step = sizeForLoad(
    size,
    Math.max(tl ?? 0, tr ?? 0) + Math.max(bl ?? 0, br ?? 0),
    quadrantFit,
    context?.crowding
  );
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, quadrant.root)}>
      <span className={cls(context, label, quadrant.axisTop)}>{y.high}</span>
      <span className={cls(context, label, quadrant.axisLeft)}>{x.low}</span>
      <div className={cls(context, quadrant.plot)}>
        {quadrants.map(({ label: caption, items }, index) => (
          <div
            className={cls(
              context,
              quadrant.cell,
              quadrant.cellSize[step],
              ...(corners[index] ?? []),
              index === highlight ? quadrant.highlighted : undefined
            )}
            key={index}>
            <p
              className={cls(
                context,
                quadrant.caption,
                index === highlight ? quadrant.highlightedCaption : undefined
              )}>
              {caption}
            </p>
            {items.length > 0 ? (
              <ul
                className={cls(
                  context,
                  quadrant.items,
                  quadrant.itemsSize[step],
                  ...(itemCorners[index] ?? [])
                )}>
                {items.map((item, itemIndex) => (
                  <li
                    className={cls(
                      context,
                      quadrant.chip,
                      quadrant.chipSize[step],
                      index === highlight ? quadrant.highlightedChip : undefined
                    )}
                    key={itemIndex}>
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
      <span className={cls(context, label, quadrant.axisRight)}>{x.high}</span>
      <span className={cls(context, label, quadrant.axisBottom)}>{y.low}</span>
    </div>
  );
};
