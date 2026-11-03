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

/** What draws Isomer's side now; a field left out is not checked. */
export interface Drawers {
  elasticCharts?: string | undefined;
  playwright?: string | undefined;
  chromium?: string | undefined;
}

/** Each case captured with something other than what draws Isomer's side now, and what differs. */
export const staleCaptures = (
  cases: readonly Pick<ComparisonCase, 'id' | 'provenance'>[],
  current: Drawers
): string[] =>
  cases.flatMap(({ id, provenance: { elasticCharts, browser } }) =>
    (
      [
        ['elasticCharts', elasticCharts],
        ['playwright', browser.playwright],
        ['chromium', browser.chromium],
      ] as const
    )
      .filter(
        ([key, value]) => current[key] !== undefined && current[key] !== value
      )
      .map(([key, value]) => `${id}: ${key} ${value}, now ${current[key]}`)
  );
