/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import { buildIsomerAuthoringGuide } from './guide';
import {
  ISOMER_AUTHORING_GUIDE_URI,
  ISOMER_COMPOSE_PROMPT,
  ISOMER_COMPOSITION_SCHEMA_URI,
} from './names';
import type { IsomerGuideOptions, IsomerPrompt, IsomerResource } from './types';

/** The authoring guide and the whole composition JSON Schema. */
export const createIsomerResources = (
  options: IsomerGuideOptions
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

const composeArgs = z.object({
  request: z.string().optional().describe('What the view should answer.'),
});

/** The `compose` prompt: the authoring guide, then the request. */
export const createIsomerPrompts = (
  options: IsomerGuideOptions
): IsomerPrompt[] => {
  const compose: IsomerPrompt<typeof composeArgs> = {
    name: ISOMER_COMPOSE_PROMPT,
    title: 'Compose a view',
    description: 'The authoring guide, followed by what to show.',
    argsSchema: composeArgs,
    build: ({ request }) => {
      const guide = buildIsomerAuthoringGuide(options);
      return request === undefined
        ? guide
        : `${guide}\n\n## Request\n\n${request}`;
    },
  };
  return [compose];
};
