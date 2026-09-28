/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, type ZodObject } from 'zod';

import { buildIsomerAuthoringGuide } from './guide';
import { ISOMER_COMPOSE_PROMPT } from './names';
import type { IsomerPrompt, IsomerToolsBaseOptions } from './types';

const prompt = <TArgs extends ZodObject>(
  definition: IsomerPrompt<TArgs>
): IsomerPrompt => definition;

/** The `compose` prompt: the authoring guide, then what to show. */
export const createIsomerPrompts = (
  options: Pick<
    IsomerToolsBaseOptions,
    'runtime' | 'guide' | 'rules' | 'examples' | 'profile'
  >
): IsomerPrompt[] => [
  prompt({
    name: ISOMER_COMPOSE_PROMPT,
    title: 'Compose a view',
    description: 'The authoring guide, followed by what to show.',
    argsSchema: z.object({
      request: z.string().optional().describe('What the view should answer.'),
    }),
    build: ({ request }) => {
      const guide = buildIsomerAuthoringGuide(options);
      return request === undefined
        ? guide
        : `${guide}\n\n## Request\n\n${request}`;
    },
  }),
];
