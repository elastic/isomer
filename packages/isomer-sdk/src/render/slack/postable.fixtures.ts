/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'vitest';

import { renderSlackEnvelope } from './envelope';
import { slackLimitProblems } from './limit_problems';

/** {@link renderSlackEnvelope}, failing the test when its payload breaks a Slack limit. */
export const renderPostable: typeof renderSlackEnvelope = (
  composition,
  dispatcher,
  options
) => {
  const result = renderSlackEnvelope(composition, dispatcher, options);
  expect(slackLimitProblems(result)).toEqual([]);
  return result;
};
