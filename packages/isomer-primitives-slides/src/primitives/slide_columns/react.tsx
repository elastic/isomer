/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { columnsFit } from '../../theme/components/columns';
import { layoutModule } from '../../theme/modules';
import { rowLoad, sizeForLoad } from '../size';

import type { SlideColumnsNode } from './schema';
import { columnsModule } from './styles';

/** React renderer for {@link SlideColumnsNode}. */
export const react = (
  { items, footnote, size }: SlideColumnsNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: columns } = columnsModule;
  const step = sizeForLoad(
    size,
    rowLoad(items.map(({ title, tags, body }) => [title, ...tags, body])) +
      (footnote ? footnote.code.length + footnote.text.length : 0),
    columnsFit,
    context?.crowding
  );
  return (
    <div className={cls(context, layoutModule.handles.fill)}>
      <ul className={cls(context, columns.list)}>
        {items.map(({ title, tags, body }, index) => (
          <li
            className={cls(
              context,
              columns.item,
              index > 0 ? columns.ruled : undefined,
              index < items.length - 1 ? columns.gutter : undefined
            )}
            key={index}>
            <h3
              className={cls(context, columns.title, columns.titleSize[step])}>
              {title}
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
            <p className={cls(context, columns.body, columns.bodySize[step])}>
              {body}
            </p>
          </li>
        ))}
      </ul>
      {footnote ? (
        <p className={cls(context, columns.footnote)}>
          <code className={cls(context, columns.footnoteCode)}>
            {footnote.code}
          </code>
          <span>{footnote.text}</span>
        </p>
      ) : null}
    </div>
  );
};
