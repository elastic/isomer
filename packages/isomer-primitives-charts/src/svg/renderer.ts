/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { SCENE_KINDS, type SceneRenderer } from '../scene/types';

import { drawScene } from './draw';
import { toReactDom } from './react_dom';

/**
 * The fallback renderer: every kind, as inline SVG with literal colors, in
 * the browser and on Node. Native hosts draw the same tree through
 * `drawScene` and their own SVG components, or `toSvgMarkup`.
 */
export const isomerSvgRenderer: SceneRenderer<ReactNode> = {
  id: 'isomer-svg',
  environments: ['browser', 'node'],
  supports: (kind) => SCENE_KINDS.includes(kind),
  render: (scene) => toReactDom(drawScene(scene)),
};
