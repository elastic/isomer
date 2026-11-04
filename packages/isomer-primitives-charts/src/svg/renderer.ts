/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, type ReactNode } from 'react';

import { SCENE_KINDS, type SceneRenderer } from '../scene/types';

import { drawScene } from './draw';
import { InteractiveSceneSvg } from './interactive';
import { toReactDom } from './react_dom';

/**
 * The fallback renderer: every kind, as inline SVG with literal colors, in
 * the browser and on Node. With the host's `onEvent` and the node's `id` it
 * answers the pointer and the keyboard; without them it draws static SVG.
 * Native hosts draw the same tree through `drawScene` and their own SVG
 * components, or `toSvgMarkup`.
 */
export const isomerSvgRenderer: SceneRenderer<ReactNode> = {
  id: 'isomer-svg',
  environments: ['browser', 'node'],
  supports: (kind) => SCENE_KINDS.includes(kind),
  render: (scene, { nodeId, onEvent }) =>
    onEvent && nodeId !== undefined
      ? createElement(InteractiveSceneSvg, { scene, nodeId, onEvent })
      : toReactDom(drawScene(scene)),
};
