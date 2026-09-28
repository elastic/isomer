/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, it } from 'vitest';

import config from '../vite.config';

it('sends no CORS headers, so a page on another localhost port cannot read the studio API', () => {
  expect(config.server?.cors).toBe(false);
});
