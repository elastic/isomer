/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type SceneRenderEnv,
  selectEvent,
  type TagCloudScene,
} from '@elastic/isomer-primitives-charts/scene';

import { type Handlers, offers, raise, subjectOf } from '../../shared/events';

/** The handlers this engine passes Elastic Charts for a tag cloud Scene; empty when the chart offers nothing. */
export const tagCloudHandlers = (
  scene: TagCloudScene,
  env: SceneRenderEnv
): Handlers => {
  if (!offers(scene, env, 'tag')) {
    return {};
  }
  return {
    /** The word Elastic Charts reports: the datum this engine passed it, whose `index` `WordModel` omits. */
    onElementClick: ([first]) => {
      const word = subjectOf(first);
      const selection =
        word &&
        'text' in word &&
        'index' in word &&
        typeof word.index === 'number'
          ? scene.words[word.index]?.selection
          : undefined;
      if (selection) {
        raise(env, selectEvent(env.nodeId, selection));
      }
    },
  };
};
