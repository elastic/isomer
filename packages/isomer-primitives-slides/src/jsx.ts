/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildJsxShim } from '@elastic/isomer-sdk/author';

import { slideDeckPrimitives } from './registry';

/**
 * The pack's primitives as JSX components, one per type plus the child
 * components its branded fields declare, with `toComposition`.
 * A host destructures what it authors with.
 */
export const slideJsx = buildJsxShim(slideDeckPrimitives);
