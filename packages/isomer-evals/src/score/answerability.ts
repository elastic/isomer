/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';

import type {
  AnswerabilityScore,
  EvalCase,
  EvalRuntime,
  Judge,
} from '../types';

/**
 * Whether the composition still answers the prompt once rendered as plain text.
 *
 * Text is the floor every surface degrades to, so a view that stops answering
 * here has put its content somewhere only a richer surface shows.
 */
export const scoreAnswerability = async (
  runtime: EvalRuntime,
  judge: Judge,
  evalCase: EvalCase,
  composition: Composition
): Promise<AnswerabilityScore> => {
  const rendered = runtime.surfaces.text.render(composition);
  return { verdict: await judge({ evalCase, rendered }) };
};
