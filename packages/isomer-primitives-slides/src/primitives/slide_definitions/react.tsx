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
import { definitionsFit } from '../../theme/components/definitions';
import { layoutModule } from '../../theme/modules';
import { sizeForLoad } from '../size';

import type { SlideDefinition, SlideDefinitionsNode } from './schema';
import { definitionsModule } from './styles';

/** Past this many terms the list splits into two columns so it fits the frame. */
const SINGLE_COLUMN_MAX = 4;

/** Items split top-to-bottom, then left-to-right, so the glossary reads in order. */
const toColumns = (
  items: readonly SlideDefinition[]
): (readonly SlideDefinition[])[] => {
  if (items.length <= SINGLE_COLUMN_MAX) {
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
  const step = sizeForLoad(
    size,
    columns.length *
      Math.max(
        ...columns.map((column) =>
          column.reduce(
            (total, { term, body }) =>
              total + displayColumns(term) + displayColumns(stripMarks(body)),
            0
          )
        )
      ),
    definitionsFit,
    context?.crowding
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
