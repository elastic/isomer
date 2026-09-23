/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { slideModules } from '../../theme/modules';

import type { SlideWindowNode } from './types';

/** React renderer for {@link SlideWindowNode}. */
export const react = (
  node: SlideWindowNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { handles: window } = slideModules.window;
  const hasDots = node.chrome === 'browser' || node.chrome === 'terminal';
  return (
    <div className={cls(context, window.root)}>
      <div className={cls(context, window.bar)}>
        {hasDots ? (
          <>
            <i className={cls(context, window.dot, window.dotClose)} />
            <i className={cls(context, window.dot, window.dotMinimize)} />
            <i className={cls(context, window.dot, window.dotZoom)} />
          </>
        ) : null}
        <span
          className={cls(
            context,
            window.title,
            window.titleChrome[node.chrome]
          )}>
          {node.title}
        </span>
      </div>
      <div
        className={cls(
          context,
          window.body,
          node.chrome === 'terminal' ? window.terminalBody : undefined
        )}>
        {node.body.map((child, index) => (
          <Fragment key={index}>{scope.renderReact(child, context)}</Fragment>
        ))}
      </div>
    </div>
  );
};
