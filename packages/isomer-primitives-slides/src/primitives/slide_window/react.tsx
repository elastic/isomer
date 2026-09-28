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
import { layoutModule } from '../../theme/modules';

import { windowModule } from './styles';
import { windowTitle } from './title';
import type { SlideWindowNode } from './types';

/** React renderer for {@link SlideWindowNode}. */
export const react = (
  node: SlideWindowNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { body, chrome, type } = node;
  const { handles: window } = windowModule;
  const slack = chrome === 'slack';
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, window.panel)}>
        <div
          className={cls(
            context,
            window.bar,
            slack ? window.slackBar : window.appBar
          )}>
          {windowTitle(node)}
        </div>
        <div
          className={cls(
            context,
            window.body,
            slack ? window.slackBody : window.appBody
          )}>
          {body.map((child, index) => (
            <Fragment key={index}>{scope.renderReact(child, context)}</Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
