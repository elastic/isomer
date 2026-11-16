/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Scene } from '@elastic/isomer-primitives-charts/scene';

import { ariaDescriptionOf } from './accessibility';
import type { ElasticChartsOptions } from './options';
import { kibanaBaseTheme } from './theme';

/** The `Settings` props every Scene kind sets the same way. */
export const commonSettings = (
  scene: Scene,
  options: ElasticChartsOptions
) => ({
  baseTheme: kibanaBaseTheme(scene.scheme),
  locale: scene.locale,
  debugState: options.debugState ?? false,
  ...(scene.title === undefined ? {} : { ariaLabel: scene.title }),
  ariaDescription: ariaDescriptionOf(scene),
});
