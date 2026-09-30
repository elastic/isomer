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
import {
  definitionsFit,
  definitionsRowFit,
  definitionsSingleColumnMax,
} from '../../theme/components/definitions';
import { frameContentWidth } from '../../theme/components/frame';
import { layoutModule } from '../../theme/modules';
import { slideLayout } from '../layout';
import { narrowing, rowLoad, sizeForLoad, smallerStep } from '../size';

import type { SlideDefinition, SlideDefinitionsNode } from './schema';
import { definitionsModule } from './styles';

/** Top-to-bottom, then left-to-right, so the glossary reads in order. */
const toColumns = (
  items: readonly SlideDefinition[]
): (readonly SlideDefinition[])[] => {
  if (items.length <= definitionsSingleColumnMax) {
    return [items];
  }
  const half = Math.ceil(items.length / 2);
  return [items.slice(0, half), items.slice(half)];
};

/** React renderer for {@link SlideDefinitionsNode}. */
export const react = (
  { type, items, size }: SlideDefinitionsNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: definitions } = definitionsModule;
  const columns = toColumns(items);
  const { width, crowding } = slideLayout(context);
  const step = smallerStep(
    sizeForLoad(
      size,
      rowLoad(
        columns.map((column) =>
          column.flatMap(({ term, body }) => [term, stripMarks(body)])
        )
      ) * narrowing(frameContentWidth, width),
      definitionsFit,
      crowding
    ),
    sizeForLoad(
      size,
      Math.max(...columns.map(({ length }) => length)),
      definitionsRowFit,
      crowding
    )
  );
  return (
    <div
      {...nodeAnchor(context, { type })}
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
