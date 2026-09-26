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
import { roadmapFit } from '../../theme/components/roadmap';
import { labelModule, layoutModule, tonesModule } from '../../theme/modules';
import { rowLoad, sizeForLoad } from '../size';

import type { SlideRoadmapNode } from './schema';
import { roadmapModule } from './styles';

/** React renderer for {@link SlideRoadmapNode}. */
export const react = (
  { type, columns, size }: SlideRoadmapNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: roadmap } = roadmapModule;
  const { handles: label } = labelModule;
  const step = sizeForLoad(
    size,
    rowLoad(
      columns.map(({ title, status, items }) => [
        title,
        status,
        ...items.flatMap((item) => [item.title, item.body].map(stripMarks)),
      ])
    ),
    roadmapFit,
    context?.crowding
  );
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <ol className={cls(context, roadmap.list)}>
        {columns.map(({ title, status, current, items }, index) => (
          <li
            key={index}
            aria-current={current ? 'step' : undefined}
            className={cls(
              context,
              roadmap.column,
              index > 0 ? roadmap.ruled : undefined,
              index < columns.length - 1 ? roadmap.gutter : undefined
            )}>
            <h3
              className={cls(
                context,
                roadmap.title,
                roadmap.titleSize[step],
                current ? roadmap.titleCurrent : undefined
              )}>
              {title}
            </h3>
            <span
              className={cls(
                context,
                label.label,
                roadmap.status,
                current ? label.toned : undefined,
                current ? tonesModule.handles.tone.primary : undefined
              )}>
              {status}
            </span>
            <ul
              className={cls(context, roadmap.items, roadmap.itemsSize[step])}>
              {items.map((item, itemIndex) => (
                <li
                  className={cls(context, roadmap.item, roadmap.itemSize[step])}
                  key={itemIndex}>
                  <span
                    className={cls(
                      context,
                      roadmap.itemTitle,
                      roadmap.itemTitleSize[step]
                    )}>
                    {marksReact(item.title, context, 'primary')}
                  </span>
                  <span
                    className={cls(
                      context,
                      roadmap.itemBody,
                      roadmap.itemBodySize[step]
                    )}>
                    {marksReact(item.body, context)}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
};
