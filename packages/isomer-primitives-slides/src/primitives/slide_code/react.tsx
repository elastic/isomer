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

import type { SlideCodeNode } from './schema';

/** React renderer for {@link SlideCodeNode}. */
export const react = (
  node: SlideCodeNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: code } = slideModules.code;
  const { handles: label } = slideModules.label;
  return (
    <div className={cls(context, code.root)}>
      {node.label ? (
        <div className={cls(context, label.label)}>{node.label}</div>
      ) : null}
      <pre>
        <code>{node.code}</code>
      </pre>
    </div>
  );
};
