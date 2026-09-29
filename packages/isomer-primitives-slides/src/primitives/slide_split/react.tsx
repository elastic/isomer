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
import { slideDistillery } from '../../theme/distillery';
import {
  connectorModule,
  layoutModule,
  tonesModule,
} from '../../theme/modules';

import { splitModule } from './styles';
import type { SlideSplitNode, SlideSplitPane } from './types';

const { label: connectorLabel } = slideDistillery.tokens.connector;

const Pane = ({
  pane: { label, tone, items },
  context,
  scope,
}: {
  pane: SlideSplitPane;
  context: SlideReactEnv['context'];
  scope: SlideReactEnv['scope'];
}): ReactNode => {
  const { handles: split } = splitModule;
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
        {items.map((node, index) => (
          <Fragment key={index}>{scope.renderReact(node, context)}</Fragment>
        ))}
      </div>
    </div>
  );
};

/** React renderer for {@link SlideSplitNode}. */
export const react = (
  {
    divider = 'gap',
    footnote,
    panes: [left, right],
    ratio = 'even',
    type,
  }: SlideSplitNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { handles: split } = splitModule;
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
        <Pane pane={left} {...{ context, scope }} />
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
        <Pane pane={right} {...{ context, scope }} />
      </div>
      {footnote ? (
        <p className={cls(context, split.footnote)}>
          {marksReact(footnote, context)}
        </p>
      ) : null}
    </div>
  );
};
