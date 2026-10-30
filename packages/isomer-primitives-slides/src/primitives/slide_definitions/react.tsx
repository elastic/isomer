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
import { layoutModule } from '../../theme/modules';
import { slideLayout } from '../layout';

import { definitionColumns, definitionsStep } from './fit';
import type { SlideDefinitionsNode } from './schema';
import { definitionsModule } from './styles';

/** React renderer for {@link SlideDefinitionsNode}. */
export const react = (
  node: SlideDefinitionsNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: definitions } = definitionsModule;
  const columns = definitionColumns(node.items);
  const step = definitionsStep(node, slideLayout(context));
  return (
    <div
      {...nodeAnchor(context, { type: node.type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, definitions.columns)}>
        {columns.map((column, columnIndex) => (
          <dl className={cls(context, definitions.list)} key={columnIndex}>
            {column.map(({ term, body }, index) => (
              <div
                className={cls(
                  context,
                  definitions.row,
                  definitions.rowSize[step]
                )}
                key={index}>
                <dt
                  className={cls(
                    context,
                    definitions.term,
                    definitions.termSize[step]
                  )}>
                  {term}
                </dt>
                <dd
                  className={cls(
                    context,
                    definitions.body,
                    definitions.bodySize[step]
                  )}>
                  {marksReact(body, context)}
                </dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
    </div>
  );
};
