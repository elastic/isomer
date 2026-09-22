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

import type { SlideFlowNode } from './schema';

/** React renderer for {@link SlideFlowNode}. */
export const react = (
  node: SlideFlowNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: flow } = slideModules.flow;
  const { handles: label } = slideModules.label;
  return (
    <div className={cls(context, flow.block)}>
      {node.label ? (
        <div className={cls(context, label.label)}>{node.label}</div>
      ) : null}
      <div className={cls(context, flow.flow)}>
        {node.nodes.map((name, index) => (
          <div className={cls(context, flow.part)} key={`${name}-${index}`}>
            <span>{name}</span>
            {index < node.nodes.length - 1 ? (
              <i
                className={cls(
                  context,
                  flow.line,
                  node.boundaryAfter !== undefined &&
                    index + 1 >= node.boundaryAfter
                    ? flow.linePrimary
                    : undefined
                )}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};
