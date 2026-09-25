/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { labelModule, layoutModule } from '../../theme/modules';

import { type SlideTableNode, tableGroups } from './schema';
import { tableColumnCounts, tableModule } from './styles';

/** React renderer for {@link SlideTableNode}. */
export const react = (
  node: SlideTableNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: table } = tableModule;
  const { columns, label, rowHeaders } = node;
  const groups = tableGroups(node);
  const count =
    tableColumnCounts[Math.min(columns.length, tableColumnCounts.length) - 1] ??
    'one';
  return (
    <div className={cls(context, layoutModule.handles.fill, table.root)}>
      {label ? (
        <div className={cls(context, labelModule.handles.label)}>{label}</div>
      ) : null}
      <div className={cls(context, table.grid, table.columns[count])}>
        {columns.map((column, index) => (
          <div className={cls(context, table.head)} key={index}>
            {column}
          </div>
        ))}
        {groups.map((group, groupIndex) => {
          const lastGroup = groupIndex === groups.length - 1;
          return (
            <Fragment key={groupIndex}>
              {group.label ? (
                <div
                  className={cls(
                    context,
                    table.group,
                    groupIndex > 0 ? table.laterGroup : table.firstGroup
                  )}>
                  {group.label}
                </div>
              ) : null}
              {group.rows.map((row, rowIndex) => {
                const lastRow = lastGroup && rowIndex === group.rows.length - 1;
                return row.map((cell, index) => (
                  <div
                    className={cls(
                      context,
                      table.cell,
                      rowHeaders && index === 0 ? table.rowHeader : table.value,
                      lastRow ? undefined : table.divided
                    )}
                    key={`${rowIndex}.${index}`}>
                    {cell}
                  </div>
                ));
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};
