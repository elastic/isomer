/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { assertStudioProvenance, studioIdentity } from './studio_provenance.js';

const env = {
  STUDIO_HEAD_SHA: '0123456789abcdef0123456789abcdef01234567',
  GITHUB_REPOSITORY: 'elastic/isomer',
  GITHUB_RUN_ID: '123',
  GITHUB_RUN_ATTEMPT: '2',
  STUDIO_PR_NUMBER: '280',
};
const expected = {
  headSha: env.STUDIO_HEAD_SHA,
  repository: 'elastic/isomer',
  runId: '123',
  runAttempt: '2',
  prNumber: '280',
};
const passing = {
  ...expected,
  version: 1,
  checkoutSha: env.STUDIO_HEAD_SHA,
  config: 'isomer-studio.config.ts',
  images: false,
  data: 'examples-only; no live data',
};

describe('Studio provenance', () => {
  it('reads independently provided workflow identity and accepts the matching build', () => {
    expect(studioIdentity(env)).toEqual(expected);
    expect(() => assertStudioProvenance(passing, expected)).not.toThrow();
  });

  it.each(Object.keys(expected))(
    'refuses changed %s even with other matching fields',
    (field) => {
      expect(() =>
        assertStudioProvenance({ ...passing, [field]: 'wrong' }, expected)
      ).toThrow(`mismatch: ${field}`);
    }
  );

  it.each([
    { checkoutSha: 'f'.repeat(40) },
    { config: 'other.ts' },
    { images: true },
    { data: 'live data' },
    { version: 2 },
  ])('refuses a wrong build contract %j', (change) => {
    expect(() =>
      assertStudioProvenance({ ...passing, ...change }, expected)
    ).toThrow();
  });

  it.each([
    { STUDIO_HEAD_SHA: 'main' },
    { GITHUB_REPOSITORY: '' },
    { GITHUB_RUN_ID: '0' },
    { GITHUB_RUN_ATTEMPT: '-1' },
    { STUDIO_PR_NUMBER: undefined },
  ])('refuses invalid trusted input %j', (change) => {
    expect(() => studioIdentity({ ...env, ...change })).toThrow('Invalid');
  });

  it('supports main builds without inventing a PR', () => {
    expect(
      studioIdentity({ ...env, STUDIO_PR_NUMBER: '' }).prNumber
    ).toBeNull();
  });
});
