/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import type { ChartsReactEnv } from '../../render';
import { cls } from '../../render';

import type { UnsupportedNode } from './schema';
import { unsupportedModule } from './styles';

const { handles: note } = unsupportedModule;

/** The note: title, reason, and a link where there is one. */
export const react = (
  node: UnsupportedNode,
  { context }: Pick<ChartsReactEnv, 'context'>
): ReactNode => (
  <div
    {...nodeAnchor(context, node)}
    role="note"
    className={cls(context, note.root)}>
    <strong className={cls(context, note.title)}>{node.title}</strong>
    <span className={cls(context, note.body)}>{node.reason}</span>
    {node.link && (
      <a href={node.link.href} className={cls(context, note.body)}>
        {node.link.label}
      </a>
    )}
  </div>
);
