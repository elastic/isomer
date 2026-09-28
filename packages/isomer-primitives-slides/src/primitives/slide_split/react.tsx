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
import { marksReact } from '../../render/marks';
import { splitFit } from '../../theme/components/split';
import { slideDistillery } from '../../theme/distillery';
import {
  connectorModule,
  layoutModule,
  tonesModule,
} from '../../theme/modules';
import type { SlideSize } from '../../theme/variants';
import { sizeForLoad } from '../size';

import { splitLoad } from './fit';
import { splitBlocks } from './items';
import { splitModule } from './styles';
import type { SlideSplitNode, SlideSplitSide } from './types';

const { label: connectorLabel } = slideDistillery.tokens.connector;

const Side = ({
  side,
  step,
  context,
  scope,
}: {
  side: SlideSplitSide;
  step: SlideSize;
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
                <li
                  className={cls(
                    context,
                    split.statement,
                    split.statementSize[step]
                  )}
                  key={index}>
                  {marksReact(text, context, 'primary')}
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
  {
    divider = 'gap',
    footnote,
    left,
    ratio = 'even',
    right,
    size,
    type,
  }: SlideSplitNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { handles: split } = splitModule;
  const step = sizeForLoad(
    size,
    splitLoad({ left, right, ratio, divider }),
    splitFit,
    context?.crowding
  );
  const { handles: connector } = connectorModule;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div
        className={cls(
          context,
          split.grid,
          split.ratio[ratio],
          split.divider[divider]
        )}>
        <Side side={left} {...{ step, context, scope }} />
        {divider === 'rule' ? (
          <div aria-hidden className={cls(context, split.rule)} />
        ) : divider === 'hairline' ? (
          <div aria-hidden className={cls(context, split.hairline)} />
        ) : divider === 'arrow' ? (
          <div
            role="img"
            aria-label={connectorLabel.value}
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
        <Side side={right} {...{ step, context, scope }} />
      </div>
      {footnote ? (
        <p className={cls(context, split.footnote)}>
          {marksReact(footnote, context)}
        </p>
      ) : null}
    </div>
  );
};
