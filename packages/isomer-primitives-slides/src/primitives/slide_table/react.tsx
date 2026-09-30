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
import { labelModule, layoutModule } from '../../theme/modules';
import { countKey } from '../../theme/variants';
import { slideLayout } from '../layout';

import { tableSize } from './fit';
import { type SlideTableNode, tableGroups } from './schema';
import { tableModule } from './styles';

/** React renderer for {@link SlideTableNode}. */
export const react = (
  node: SlideTableNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: table } = tableModule;
  const { columns, label, rowHeaders, type } = node;
  const step = tableSize(node, slideLayout(context));
  const groups = tableGroups(node);
  const tracks = table.columns[countKey(columns.length)];
  // Explicit roles, since some browsers drop table semantics once `display` changes.
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <table role="table" className={cls(context, table.root)}>
        {label ? (
          <caption
            className={cls(context, labelModule.handles.label, table.caption)}>
            {label}
          </caption>
        ) : null}
        <thead
          role="rowgroup"
          className={cls(context, table.rows, table.rowsFirst)}>
          <tr role="row" className={cls(context, table.row, tracks)}>
            {columns.map((column, index) => (
              <th
                role="columnheader"
                scope="col"
                className={cls(context, table.head, table.headStep[step])}
                key={index}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map(({ label: group, rows }, groupIndex) => {
          const lastGroup = groupIndex === groups.length - 1;
          return (
            <tbody
              role="rowgroup"
              className={cls(
                context,
                table.rows,
                lastGroup ? table.rowsLast : undefined
              )}
              key={groupIndex}>
              {group ? (
                <tr role="row" className={cls(context, table.row)}>
                  <th
                    role="rowheader"
                    scope="rowgroup"
                    colSpan={columns.length}
                    className={cls(
                      context,
                      table.group,
                      table.groupStep[step],
                      (groupIndex > 0 ? table.groupLater : table.groupFirst)[
                        step
                      ]
                    )}>
                    {group}
                  </th>
                </tr>
              ) : null}
              {rows.map((row, rowIndex) => (
                <tr
                  role="row"
                  className={cls(
                    context,
                    table.row,
                    tracks,
                    lastGroup && rowIndex === rows.length - 1
                      ? undefined
                      : table.divided
                  )}
                  key={rowIndex}>
                  {row.map((cell, index) =>
                    rowHeaders && index === 0 ? (
                      <th
                        role="rowheader"
                        scope="row"
                        className={cls(
                          context,
                          table.cell,
                          table.rowHeader,
                          table.rowHeaderStep[step],
                          table.cellStep[step]
                        )}
                        key={index}>
                        {cell}
                      </th>
                    ) : (
                      <td
                        role="cell"
                        className={cls(
                          context,
                          table.cell,
                          table.value,
                          table.valueStep[step],
                          table.cellStep[step]
                        )}
                        key={index}>
                        {cell}
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
};
