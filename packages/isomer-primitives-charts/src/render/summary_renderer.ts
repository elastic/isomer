/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';

import { SCENE_KINDS } from '../scene/types';

import type { ReactSceneRenderer } from './context';

/** Draws a Scene's summary sentence. The pack's last resort for every kind. */
export const summarySceneRenderer: ReactSceneRenderer = {
  id: 'summary',
  environments: ['browser', 'node'],
  supports: (kind) => SCENE_KINDS.includes(kind),
  render: (scene) => createElement('p', null, scene.summary),
};
