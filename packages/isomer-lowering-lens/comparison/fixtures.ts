/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { caseSchema, type ComparisonCase } from './case';

export const FIXTURES = join(__dirname, '__fixtures__');

/** Every captured case on disk, for tests that run in Node. */
export const readCases = (): ComparisonCase[] =>
  readdirSync(FIXTURES, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(FIXTURES, entry.name, 'case.json'))
    )
    .map(({ name }) =>
      caseSchema.parse(
        JSON.parse(readFileSync(join(FIXTURES, name, 'case.json'), 'utf8'))
      )
    );
