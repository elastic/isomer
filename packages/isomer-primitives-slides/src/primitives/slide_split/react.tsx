/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import {
  connectorModule,
  layoutModule,
  tonesModule,
} from '../../theme/modules';

import { splitBlocks } from './items';
import { splitModule } from './styles';
import type { SlideSplitNode, SlideSplitSide } from './types';

const Side = ({
  side,
  context,
  scope,
}: {
  side: SlideSplitSide;
  context: SlideReactEnv['context'];
  scope: SlideReactEnv['scope'];
}): ReactNode => {
  const { handles: split } = splitModule;
  const { label, tone } = side;
  return (
    <div className={cls(context, split.column)}>
      {label ? (
        <div
          className={cls(
            context,
            split.label,
            tone ? tonesModule.handles.tone[tone] : undefined,
            tone ? split.tonedLabel : split.plainLabel
          )}>
          {label}
        </div>
      ) : null}
      <div className={cls(context, split.items)}>
        {splitBlocks(side).map((block) =>
          block.kind === 'node' ? (
            <Fragment key={block.index}>
              {scope.renderReact(block.node, context)}
            </Fragment>
          ) : (
            <ul
              className={cls(context, split.statements)}
              key={block.statements[0]?.index}>
              {block.statements.map(({ text, index }) => (
                <li className={cls(context, split.statement)} key={index}>
                  {text}
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
};

/** React renderer for {@link SlideSplitNode}. */
export const react = (
  { divider = 'gap', footnote, left, ratio = 'even', right }: SlideSplitNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { handles: split } = splitModule;
  const { handles: connector } = connectorModule;
  return (
    <div className={cls(context, layoutModule.handles.fill)}>
      <div
        className={cls(
          context,
          split.grid,
          split.ratio[ratio],
          split.divider[divider]
        )}>
        <Side side={left} {...{ context, scope }} />
        {divider === 'rule' ? (
          <div aria-hidden className={cls(context, split.rule)} />
        ) : divider === 'arrow' ? (
          <div
            aria-hidden
            className={cls(
              context,
              split.arrow,
              connector.across,
              connector.primary
            )}>
            <div className={cls(context, connector.railAcross)} />
            <div className={cls(context, connector.headRight)} />
          </div>
        ) : (
          <div aria-hidden />
        )}
        <Side side={right} {...{ context, scope }} />
      </div>
      {footnote ? (
        <p className={cls(context, split.footnote)}>{footnote}</p>
      ) : null}
    </div>
  );
};
