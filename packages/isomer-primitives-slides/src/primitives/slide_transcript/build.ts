/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { listItemUnits, type SlideBuild } from '../../builds/types';

import type { SlideTranscriptNode } from './schema';

export const transcriptBuild: SlideBuild<SlideTranscriptNode> = {
  count: ({ turns }) => turns.length,
  units: listItemUnits,
};
