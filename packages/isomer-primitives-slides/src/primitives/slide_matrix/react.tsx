/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv, SlideRenderContext } from '../../render/context';
import { marksReact } from '../../render/marks';
import { matrixFit } from '../../theme/components/matrix';
import { slideDistillery } from '../../theme/distillery';
import { layoutModule } from '../../theme/modules';
import {
  slideMatrixColumnCounts,
  type SlideMatrixMark,
  slideMatrixMarks,
} from '../../theme/variants';
import { sizeForLoad } from '../size';

import type { SlideMatrixNode } from './schema';
import { matrixModule } from './styles';

const { markWords } = slideDistillery.tokens.matrix;

const Mark = ({
  kind,
  legend,
  highlighted,
  context,
}: {
  kind: SlideMatrixMark;
  legend?: boolean;
  highlighted?: boolean;
  context: SlideRenderContext | undefined;
}): ReactNode => {
  const { handles: matrix } = matrixModule;
  const size =
    kind === 'none' ? undefined : legend ? matrix.legendSize : matrix.size;
  return (
    <span
      aria-label={markWords[kind].value}
      className={cls(
        context,
        matrix.mark,
        size,
        (highlighted ? matrix.highlightedKind : matrix.kind)[kind]
      )}
      role="img"
    />
  );
};

/** React renderer for {@link SlideMatrixNode}. */
export const react = (
  { type, columns, rows, highlight, legend = true, size }: SlideMatrixNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: matrix } = matrixModule;
  const count =
    slideMatrixColumnCounts[columns.length - 2] ?? slideMatrixColumnCounts[0];
  const padding =
    matrix.cellPadding[
      sizeForLoad(size, rows.length, matrixFit, context?.crowding)
    ];
  const used = slideMatrixMarks.filter((kind) =>
    rows.some(({ marks }) => marks.includes(kind))
  );
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, matrix.root)}>
        <div
          className={cls(
            context,
            matrix.row,
            matrix.columns[count],
            matrix.head
          )}>
          <span />
          {columns.map((column, index) => (
            <span
              className={cls(
                context,
                matrix.heading,
                index === highlight ? matrix.highlightedHeading : undefined
              )}
              key={index}>
              {marksReact(column, context)}
            </span>
          ))}
        </div>
        {rows.map(({ label, marks }, rowIndex) => (
          <div
            className={cls(
              context,
              matrix.row,
              matrix.columns[count],
              matrix.body
            )}
            key={rowIndex}>
            <span className={cls(context, matrix.label, padding)}>
              {marksReact(label, context, 'primary')}
            </span>
            {marks.map((kind, index) => (
              <span
                className={cls(
                  context,
                  matrix.cell,
                  padding,
                  index === highlight ? matrix.band : undefined
                )}
                key={index}>
                <Mark
                  highlighted={index === highlight}
                  {...{ kind, context }}
                />
              </span>
            ))}
          </div>
        ))}
        {legend ? (
          <div className={cls(context, matrix.legend)}>
            {used.map((kind) => (
              <div className={cls(context, matrix.legendItem)} key={kind}>
                <Mark {...{ kind, context }} legend />
                {markWords[kind].value}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
