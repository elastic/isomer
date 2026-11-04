/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitiveFor } from '@elastic/isomer-sdk';

import type { ChartsPackTypes } from './context';

/** `definePrimitive` bound to this pack's types. */
export const definePrimitive = definePrimitiveFor<ChartsPackTypes>();
