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
import { slideDistillery } from '../../theme/distillery';
import { layoutModule } from '../../theme/modules';

import { columnsHeadHeight, columnsStep } from './fit';
import type { SlideColumnsNode } from './schema';
import { columnsModule } from './styles';

const { highlightLabel } = slideDistillery.tokens.columns;

/** React renderer for {@link SlideColumnsNode}. */
export const react = (
  node: SlideColumnsNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { type, items, footnote, highlight } = node;
  const { handles: columns } = columnsModule;
  const step = columnsStep(node, context?.crowding);
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
              index > 0 ? columns.ruled : undefined,
              index < items.length - 1 ? columns.gutter : undefined
            )}
            key={index}>
            {highlight === undefined ? null : index === highlight ? (
              <div
                role="img"
                aria-label={highlightLabel.value}
                className={cls(context, columns.bar, columns.barOn)}
              />
            ) : (
              <div aria-hidden className={cls(context, columns.bar)} />
            )}
            <div className={cls(context, columns.content)}>
              <div
                className={cls(context, columns.head)}
                style={{ minHeight: `${headHeight}px` }}>
                <h2
                  className={cls(
                    context,
                    columns.title,
                    columns.titleSize[step],
                    index === highlight ? columns.titleHighlighted : undefined
                  )}>
                  {title}
                </h2>
                {tags.length > 0 ? (
                  <div className={cls(context, columns.tags)}>
                    {tags.map((tag, tagIndex) => (
                      <code
                        className={cls(context, columns.tag)}
                        key={tagIndex}>
                        {tag}
                      </code>
                    ))}
                  </div>
                ) : null}
              </div>
              <p className={cls(context, columns.body, columns.bodySize[step])}>
                {marksReact(body, context)}
              </p>
            </div>
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
