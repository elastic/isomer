/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { codeDenseAfter } from '../../theme/components/code';
import { slideDistillery } from '../../theme/distillery';
import { layoutModule } from '../../theme/modules';

import type { SlideDiffNode } from './schema';
import { diffModule } from './styles';

const { marker, markerLabel } = slideDistillery.tokens.diff;

/** React renderer for {@link SlideDiffNode}. */
export const react = (
  { type, file, lines }: SlideDiffNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: diff } = diffModule;
  const dense = lines.length > codeDenseAfter;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <figure className={cls(context, diff.figure)}>
        {file ? (
          <figcaption className={cls(context, diff.file)}>{file}</figcaption>
        ) : null}
        <pre
          className={cls(
            context,
            diff.panel,
            dense ? diff.dense : diff.regular
          )}>
          {lines.map(({ text, op }, index) => (
            <Fragment key={index}>
              {/* `panel` collapses it: the line break is in the text, never drawn. */}
              {index > 0 ? '\n' : null}
              <code
                className={cls(
                  context,
                  diff.line,
                  op ? diff.op[op] : undefined
                )}>
                <span
                  {...(op
                    ? { role: 'img', 'aria-label': markerLabel[op].value }
                    : { 'aria-hidden': true })}
                  className={cls(
                    context,
                    diff.marker,
                    op ? diff.markerOp[op] : undefined
                  )}>
                  {marker[op ?? 'context'].value}
                </span>
                {op === 'add' ? (
                  <ins className={cls(context, diff.change)}>{text}</ins>
                ) : op === 'remove' ? (
                  <del className={cls(context, diff.change)}>{text}</del>
                ) : (
                  <span>{text}</span>
                )}
              </code>
            </Fragment>
          ))}
        </pre>
      </figure>
    </div>
  );
};
