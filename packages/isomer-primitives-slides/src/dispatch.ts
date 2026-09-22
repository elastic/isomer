/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrimitiveDispatcher } from '@elastic/isomer-sdk';

import { slideDeckPrimitives } from './registry';

/** Dispatcher over this pack's own inventory, for standalone previews. */
export const slidePackDispatcher = createPrimitiveDispatcher(
  slideDeckPrimitives,
  { label: 'slides-pack' }
);
