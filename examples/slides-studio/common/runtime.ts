/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDeckFrame, slidesPack } from '@elastic/isomer-primitives-slides';
import { createIsomerRuntime } from '@elastic/isomer-runtime';

/** The studio's runtime: the slides pack and its frame, shared by the server and the pages. */
export const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
