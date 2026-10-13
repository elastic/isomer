/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import type { SlideReactEnv } from '../../render/context';
import { CodePanels } from '../slide_code/react';

import type { SlideCodeTraceNode } from './schema';

/** React renderer for {@link SlideCodeTraceNode}. */
export const react = (
  { type, panels }: SlideCodeTraceNode,
  { context }: SlideReactEnv
): ReactNode => <CodePanels {...{ type, panels, context }} />;
