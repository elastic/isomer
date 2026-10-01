/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

/**
 * A non-empty string.
 *
 * `message` is the suffix `formatZodIssue` prepends a path to, so phrase
 * it as a predicate (`must be a hex color`), not a sentence.
 */
export const requiredString = (message = 'is required') =>
  z.string({ error: () => message }).min(1, { error: message });

export { z };
