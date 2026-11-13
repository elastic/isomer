/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment } from 'react';

import { SCENE_KINDS } from '../scene/types';
import { described, sceneNotes } from '../text/scene_text';

import type { ReactSceneRenderer } from './context';
import { sceneModule } from './scene_styles';
import { cls } from './styles';

/** Draws a Scene's summary sentence, description and emphasis notes. The pack's last resort for every kind. */
export const summarySceneRenderer: ReactSceneRenderer = {
  id: 'summary',
  environments: ['browser', 'node'],
  supports: (kind) => SCENE_KINDS.includes(kind),
  render: (scene, env) => {
    const className = cls(env, sceneModule.handles.summary);
    return createElement(
      Fragment,
      null,
      createElement('p', { className }, scene.summary),
      ...described(scene).map((description) =>
        createElement('p', { className }, description)
      ),
      ...sceneNotes(scene).map((note) =>
        createElement('p', { className }, createElement('em', null, note))
      )
    );
  },
};
