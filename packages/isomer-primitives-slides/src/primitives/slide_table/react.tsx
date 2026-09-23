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

import type { SlideTableNode } from './schema';

/** React renderer for {@link SlideTableNode}. */
export const react = (
  node: SlideTableNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: table } = slideModules.table;
  const { handles: label } = slideModules.label;
  return (
    <div>
      {node.label ? (
        <div className={cls(context, label.label)}>{node.label}</div>
      ) : null}
      <div className={cls(context, table.table)} role="table">
        <div className={cls(context, table.row, table.head)} role="row">
          {node.columns.map((column, index) => (
            <div
              className={cls(context, table.cell, table.headCell)}
              key={index}
              role="columnheader">
              {column}
            </div>
          ))}
        </div>
        {node.rows.map((row, rowIndex) => (
          <div className={cls(context, table.row)} key={rowIndex} role="row">
            {row.map((cell, index) => {
              const isHeader = node.rowHeaders === true && index === 0;
              return (
                <div
                  className={cls(
                    context,
                    table.cell,
                    isHeader ? table.rowHeader : undefined
                  )}
                  key={index}
                  role={isHeader ? 'rowheader' : 'cell'}>
                  {cell}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
