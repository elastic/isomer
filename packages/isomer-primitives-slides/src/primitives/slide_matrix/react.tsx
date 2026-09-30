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
import { ToneCue } from '../../render/tone_cue';
import { matrixFit } from '../../theme/components/matrix';
import { slideDistillery } from '../../theme/distillery';
import { layoutModule } from '../../theme/modules';
import {
  countKey,
  type SlideMatrixMark,
  slideMatrixMarks,
  type SlideSize,
} from '../../theme/variants';
import { slideLayout } from '../layout';
import { sizeForLoad } from '../size';

import type { SlideMatrixNode } from './schema';
import { matrixModule } from './styles';

const { markWords } = slideDistillery.tokens.matrix;

const Mark = ({
  kind,
  legend = false,
  highlighted = false,
  context,
}: {
  kind: SlideMatrixMark;
  legend?: boolean;
  highlighted?: boolean;
  context: SlideRenderContext | undefined;
}): ReactNode => {
  const { handles: matrix } = matrixModule;
  return (
    <span
      {...(legend
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': markWords[kind].value })}
      className={cls(
        context,
        matrix.mark,
        kind === 'none' ? undefined : legend ? matrix.legendSize : matrix.size,
        (highlighted ? matrix.kindHighlighted : matrix.kind)[kind]
      )}
    />
  );
};

export const matrixSize = (
  { rows, size }: Pick<SlideMatrixNode, 'rows' | 'size'>,
  crowding?: number
): SlideSize => sizeForLoad(size, rows.length, matrixFit, crowding);

/** React renderer for {@link SlideMatrixNode}. */
export const react = (
  { type, columns, rows, highlight, legend = true, size }: SlideMatrixNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: matrix } = matrixModule;
  const tracks = matrix.columns[countKey(columns.length)];
  const padding =
    matrix.cellPadding[
      matrixSize({ rows, size }, slideLayout(context).crowding)
    ];
  const used = slideMatrixMarks.filter((kind) =>
    rows.some(({ marks }) => marks.includes(kind))
  );
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <table role="table" className={cls(context, matrix.root)}>
        <thead role="rowgroup" className={cls(context, matrix.rows)}>
          <tr
            role="row"
            className={cls(context, matrix.row, tracks, matrix.head)}>
            <td role="cell" />
            {columns.map((column, index) => (
              <th
                role="columnheader"
                scope="col"
                className={cls(
                  context,
                  matrix.heading,
                  index === highlight ? matrix.headingHighlighted : undefined
                )}
                key={index}>
                {index === highlight ? (
                  <ToneCue tone="primary" {...{ context }} />
                ) : null}
                {marksReact(column, context)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup" className={cls(context, matrix.rows)}>
          {rows.map(({ label, marks }, rowIndex) => (
            <tr
              role="row"
              className={cls(context, matrix.row, tracks, matrix.body)}
              key={rowIndex}>
              <th
                role="rowheader"
                scope="row"
                className={cls(context, matrix.label, padding)}>
                {marksReact(label, context, 'primary')}
              </th>
              {marks.map((kind, index) => (
                <td
                  role="cell"
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
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {legend ? (
        <ul className={cls(context, matrix.legend)}>
          {used.map((kind) => (
            <li className={cls(context, matrix.legendItem)} key={kind}>
              <Mark {...{ kind, context }} legend />
              {markWords[kind].value}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
