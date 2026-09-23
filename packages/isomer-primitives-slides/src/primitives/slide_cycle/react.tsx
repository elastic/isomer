/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { slideModules } from '../../theme/modules';
import { scalePx } from '../../theme/scale';
import { SLIDE_THEME } from '../../theme/theme';

import type { SlideCycleNode } from './schema';

const { arrowSize, ringColor, ringRadius, ringStroke, viewBox } =
  SLIDE_THEME.cycle;

const box = scalePx(viewBox);
const middle = box / 2;
const radius = scalePx(ringRadius);
const arrow = scalePx(arrowSize);

const angleOf = (index: number, count: number) =>
  -Math.PI / 2 + (2 * Math.PI * index) / count;

const round = (value: number) => Math.round(value * 100) / 100;

/** A viewBox coordinate as a percentage of the diagram box. */
const percent = (value: number) => `${round((value / box) * 100)}%`;

/** A triangle on the ring halfway between two steps, pointing clockwise. */
const arrowPath = (angle: number): string => {
  const x = middle + radius * Math.cos(angle);
  const y = middle + radius * Math.sin(angle);
  const [tx, ty] = [-Math.sin(angle), Math.cos(angle)];
  const [nx, ny] = [Math.cos(angle), Math.sin(angle)];
  const half = arrow / 2;
  const points = [
    [x + tx * arrow, y + ty * arrow],
    [x - tx * half + nx * half, y - ty * half + ny * half],
    [x - tx * half - nx * half, y - ty * half - ny * half],
  ];
  return `M${points.map(([px, py]) => `${round(px!)} ${round(py!)}`).join(' L')} Z`;
};

/** React renderer for {@link SlideCycleNode}. */
export const react = (
  node: SlideCycleNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: cycle } = slideModules.cycle;
  const { handles: label } = slideModules.label;
  const count = node.nodes.length;
  const fill = ringColor.value;
  return (
    <div className={cls(context, cycle.block)}>
      {node.label ? (
        <div className={cls(context, label.label)}>{node.label}</div>
      ) : null}
      <div className={cls(context, cycle.diagram)}>
        <svg
          aria-hidden
          className={cls(context, cycle.svg)}
          viewBox={`0 0 ${box} ${box}`}
          xmlns="http://www.w3.org/2000/svg">
          <circle
            className={cls(context, cycle.ring)}
            cx={middle}
            cy={middle}
            fill="none"
            r={radius}
            stroke={fill}
            strokeWidth={ringStroke.value}
          />
          {node.nodes.map((_, index) => (
            <path
              className={cls(context, cycle.arrow)}
              d={arrowPath(angleOf(index + 0.5, count))}
              key={index}
              {...{ fill }}
            />
          ))}
        </svg>
        {node.center ? (
          <div className={cls(context, cycle.center)}>{node.center}</div>
        ) : null}
        {node.nodes.map((step, index) => {
          const angle = angleOf(index, count);
          return (
            <div
              className={cls(context, cycle.part)}
              key={`${step}-${index}`}
              style={{
                left: percent(middle + radius * Math.cos(angle)),
                top: percent(middle + radius * Math.sin(angle)),
              }}>
              {step}
            </div>
          );
        })}
      </div>
    </div>
  );
};
