/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment } from 'react';
import { sanitizeNavigationHref } from '@elastic/isomer-sdk';

import { SCENE_KINDS } from '../scene/types';
import { sceneNotes } from '../text/scene_text';

import type { ReactSceneRenderer } from './context';

/**
 * Draws a Scene's summary sentence, emphasis notes and link. The pack's last
 * resort for every kind.
 */
export const summarySceneRenderer: ReactSceneRenderer = {
  id: 'summary',
  environments: ['browser', 'node'],
  supports: (kind) => SCENE_KINDS.includes(kind),
  render: (scene) => {
    const { link } = scene.interactions;
    const href = link && sanitizeNavigationHref(link.href);
    return createElement(
      Fragment,
      null,
      createElement('p', null, scene.summary),
      ...sceneNotes(scene).map((note) =>
        createElement('p', null, createElement('em', null, note))
      ),
      link && href ? createElement('a', { href }, link.label) : null
    );
  },
};
