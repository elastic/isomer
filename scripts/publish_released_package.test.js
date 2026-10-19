/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { distTag, publishBlockers } from './publish_released_package.js';

const packages = [
  { folder: 'isomer-sdk', manifest: { name: '@elastic/isomer-sdk' } },
  {
    folder: 'isomer-primitives-slides',
    manifest: { name: '@elastic/isomer-primitives-slides', private: true },
  },
];

const blockers = (overrides) =>
  publishBlockers({
    files: [],
    name: '@elastic/isomer-sdk',
    packages,
    published: false,
    read: () => undefined,
    ...overrides,
  });

describe('publishBlockers', () => {
  it('allows an unpublished package with no shipped change since the tag', () => {
    expect(blockers({ files: ['.github/workflows/release.yml'] })).toEqual([]);
  });

  it.each([
    ['an unknown package', { name: '@elastic/nope' }],
    ['a private package', { name: '@elastic/isomer-primitives-slides' }],
    ['an already published version', { published: true }],
    ['a shipped change', { files: ['packages/isomer-sdk/src/index.ts'] }],
  ])('blocks %s', (_, overrides) => {
    expect(blockers(overrides)).toHaveLength(1);
  });
});

describe('distTag', () => {
  it.each([
    ['0.4.0', 'latest'],
    ['1.0.0-beta.2', 'beta'],
    ['1.0.0-alpha.1', 'alpha'],
  ])('tags %s as %s', (version, tag) => {
    expect(distTag(version)).toBe(tag);
  });
});
