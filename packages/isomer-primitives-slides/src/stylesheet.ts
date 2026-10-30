/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDeckPrimitives } from './registry';
import { slideDistillery } from './theme/distillery';

/** Hosts include this beside React markup: every module in `slideDistillery`, the shared ones and each registered primitive's. */
export const slideStylesheet = (): string => {
  // Each primitive's renderer creates its style module. The package declares no side effects, so
  // a bundler keeps the registry only for a value read from it, never for a bare import.
  void slideDeckPrimitives;
  return slideDistillery.renderStyles(slideDistillery.stylesheetCollector());
};
