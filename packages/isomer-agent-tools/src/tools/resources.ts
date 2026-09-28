/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildIsomerAuthoringGuide } from './guide';
import {
  ISOMER_AUTHORING_GUIDE_URI,
  ISOMER_COMPOSITION_SCHEMA_URI,
} from './names';
import type { IsomerResource, IsomerToolsBaseOptions } from './types';

/** The authoring guide and the whole composition JSON Schema, as resources. */
export const createIsomerResources = (
  options: Pick<
    IsomerToolsBaseOptions,
    'runtime' | 'guide' | 'rules' | 'examples' | 'profile'
  >
): IsomerResource[] => [
  {
    name: 'isomer-authoring-guide',
    uri: ISOMER_AUTHORING_GUIDE_URI,
    title: 'Isomer authoring guide',
    description:
      'The guide, rules, registered views, and an index of the primitives.',
    mimeType: 'text/markdown',
    read: () => buildIsomerAuthoringGuide(options),
  },
  {
    name: 'isomer-composition-schema',
    uri: ISOMER_COMPOSITION_SCHEMA_URI,
    title: 'Composition JSON Schema',
    description:
      'The whole authoring JSON Schema for a composition, every primitive included.',
    mimeType: 'application/json',
    read: () =>
      JSON.stringify(options.runtime.getAuthoringContext().schema, null, 2),
  },
];
