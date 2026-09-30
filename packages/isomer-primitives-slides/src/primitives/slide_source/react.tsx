/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { marksReact } from '../../render/marks';

import { prefix } from './prefix';
import type { SlideSourceNode } from './schema';
import { sourceModule } from './styles';

/** React renderer for {@link SlideSourceNode}. */
export const react = (
  { type, text }: SlideSourceNode,
  { context }: SlideReactEnv
): ReactNode => (
  <p
    {...nodeAnchor(context, { type })}
    className={cls(context, sourceModule.handles.text)}>
    {prefix} {marksReact(text, context)}
  </p>
);
