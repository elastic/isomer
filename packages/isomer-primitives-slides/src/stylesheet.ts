/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDeckPrimitives } from './registry';
import { slideDistillery } from './theme/distillery';
import { sharedModules } from './theme/modules';

/** Hosts include this beside React markup: the shared style modules and each registered primitive's. */
export const slideStylesheet = (): string => {
  const collector = slideDistillery.stylesheetCollector();
  // The package declares no side effects, so a bundler keeps a module only when
  // a value reaches it, not because creating it joined the registry.
  for (const module of [
    ...sharedModules,
    ...slideDeckPrimitives.flatMap(({ styles }) => styles),
  ]) {
    collector.useAllEntries(module);
  }
  return slideDistillery.renderStyles(collector);
};
