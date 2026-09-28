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
import { displayColumns } from '../../render/mono';
import { columnsFit } from '../../theme/components/columns';
import { layoutModule } from '../../theme/modules';
import { rowLoad, sizeForLoad } from '../size';

import { columnsHeadHeight } from './fit';
import type { SlideColumnsNode } from './schema';
import { columnsModule } from './styles';

/** React renderer for {@link SlideColumnsNode}. */
export const react = (
  { type, items, footnote, highlight, size }: SlideColumnsNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: columns } = columnsModule;
  const step = sizeForLoad(
    size,
    rowLoad(
      items.map(({ title, tags = [], body }) => [
        stripMarks(title),
        ...tags,
        stripMarks(body),
      ])
    ) +
      (footnote
        ? displayColumns(footnote.code) +
          displayColumns(stripMarks(footnote.text))
        : 0),
    columnsFit,
    context?.crowding
  );
  const headHeight = columnsHeadHeight(items, step);
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <ul className={cls(context, columns.list)}>
        {items.map(({ title, tags = [], body }, index) => (
          <li
            className={cls(
              context,
              columns.item,
              highlight === undefined ? undefined : columns.barred,
              index === highlight ? columns.highlighted : undefined,
              index > 0 ? columns.ruled : undefined,
              index < items.length - 1 ? columns.gutter : undefined
            )}
            key={index}>
            <div
              className={cls(context, columns.head)}
              style={{ minHeight: `${headHeight}px` }}>
              <h3
                className={cls(
                  context,
                  columns.title,
                  columns.titleSize[step],
                  index === highlight ? columns.titleHighlighted : undefined
                )}>
                {marksReact(title, context, 'primary')}
              </h3>
              {tags.length > 0 ? (
                <div className={cls(context, columns.tags)}>
                  {tags.map((tag, tagIndex) => (
                    <code className={cls(context, columns.tag)} key={tagIndex}>
                      {tag}
                    </code>
                  ))}
                </div>
              ) : null}
            </div>
            <p className={cls(context, columns.body, columns.bodySize[step])}>
              {marksReact(body, context)}
            </p>
          </li>
        ))}
      </ul>
      {footnote ? (
        <p className={cls(context, columns.footnote)}>
          <code className={cls(context, columns.footnoteCode)}>
            {footnote.code}
          </code>
          <span>{marksReact(footnote.text, context)}</span>
        </p>
      ) : null}
    </div>
  );
};
