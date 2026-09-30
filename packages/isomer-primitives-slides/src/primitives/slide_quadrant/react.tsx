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
import { ToneCue } from '../../render/tone_cue';
import { frameContentWidth } from '../../theme/components/frame';
import { quadrantFit } from '../../theme/components/quadrant';
import { labelModule } from '../../theme/modules';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import { narrowing, sizeForLoad } from '../size';

import { quadrantPlaces, type SlideQuadrantNode } from './schema';
import { quadrantModule } from './styles';

const { handles: quadrant } = quadrantModule;

/** Border and caption placement per cell, in schema order. */
const corners = [
  [quadrant.cellTop, quadrant.cellLeft],
  [quadrant.cellTop, quadrant.cellRight],
  [quadrant.cellBottom, quadrant.cellLeft],
  [quadrant.cellBottom, quadrant.cellRight],
] as const;

/** Where each cell's chips start: its caption's corner. */
const itemCorners = [
  [],
  [quadrant.itemsRight],
  [quadrant.itemsBottom],
  [quadrant.itemsRight, quadrant.itemsBottom],
] as const;

/** By the fullest top cell's items plus the fullest bottom cell's, scaled by how much narrower than a frame body its layout is. */
export const quadrantSize = (
  { quadrants, size }: SlideQuadrantNode,
  {
    width,
    crowding,
  }: Pick<ReturnType<typeof slideLayout>, 'width' | 'crowding'>
): SlideSize => {
  const [tl, tr, bl, br] = quadrants.map(({ items }) => items.length);
  return sizeForLoad(
    size,
    (Math.max(tl ?? 0, tr ?? 0) + Math.max(bl ?? 0, br ?? 0)) *
      narrowing(frameContentWidth, width),
    quadrantFit,
    crowding
  );
};

/** React renderer for {@link SlideQuadrantNode}. */
export const react = (
  node: SlideQuadrantNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { type, x, y, quadrants, highlight } = node;
  const { label } = labelModule.handles;
  const step = quadrantSize(node, slideLayout(context));
  const places = quadrantPlaces(node);
  // Each cell names its axis ends, so the axis labels are left to sight.
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, quadrant.root)}>
      <span aria-hidden className={cls(context, label, quadrant.axisTop)}>
        {y.high}
      </span>
      <span aria-hidden className={cls(context, label, quadrant.axisLeft)}>
        {x.low}
      </span>
      <div className={cls(context, quadrant.plot)}>
        {quadrants.map(({ label: caption, items }, index) => {
          const highlighted = index === highlight;
          return (
            <div
              role="group"
              aria-label={places[index]}
              className={cls(
                context,
                quadrant.cell,
                quadrant.cellSize[step],
                ...(corners[index] ?? []),
                highlighted ? quadrant.cellHighlighted : undefined
              )}
              key={index}>
              <p
                className={cls(
                  context,
                  quadrant.caption,
                  highlighted ? quadrant.captionHighlighted : undefined
                )}>
                {highlighted ? (
                  <ToneCue tone="primary" {...{ context }} />
                ) : null}
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
                        highlighted ? quadrant.chipHighlighted : undefined
                      )}
                      key={itemIndex}>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
      <span aria-hidden className={cls(context, label, quadrant.axisRight)}>
        {x.high}
      </span>
      <span aria-hidden className={cls(context, label, quadrant.axisBottom)}>
        {y.low}
      </span>
    </div>
  );
};
