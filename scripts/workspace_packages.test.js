/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  isPublishable,
  unpublishableReferences,
  workspacePackages,
} from './workspace_packages.js';

describe('isPublishable', () => {
  it('holds for a public package and an unseeded private one, not a private one', () => {
    expect(isPublishable({ name: 'a' })).toBe(true);
    expect(
      isPublishable({ name: 'b', private: true, isomer: { unseeded: true } })
    ).toBe(true);
    expect(isPublishable({ name: 'c', private: true })).toBe(false);
  });

  it('marks only private packages unseeded', () => {
    expect(
      workspacePackages()
        .filter(({ manifest }) => manifest.isomer?.unseeded === true)
        .filter(({ manifest }) => manifest.private !== true)
        .map(({ manifest }) => manifest.name)
    ).toEqual([]);
  });
});

describe('unpublishableReferences', () => {
  const unseeded = { private: true, isomer: { unseeded: true } };
  const manifests = [
    { name: 'public', dependencies: { seedless: '1', other: '1' } },
    { name: 'peer-of-public', peerDependencies: { exemplar: '1' } },
    { name: 'seedless', ...unseeded, dependencies: { other: '1' } },
    { name: 'other', ...unseeded, peerDependencies: { exemplar: '1' } },
    { name: 'exemplar', private: true },
    { name: 'tool', private: true, dependencies: { exemplar: '1' } },
  ];

  it('fails a published package on any private reference, and an unseeded one only on a package that never publishes', () => {
    // `seedless` lists unseeded `other`, and `tool` never publishes, so neither appears.
    expect(unpublishableReferences(manifests)).toEqual([
      'public dependencies lists seedless, which is not on npm until it is seeded',
      'public dependencies lists other, which is not on npm until it is seeded',
      'peer-of-public peerDependencies lists exemplar, which never publishes',
      'other peerDependencies lists exemplar, which never publishes',
    ]);
  });

  it('passes the workspace', () => {
    expect(
      unpublishableReferences(
        workspacePackages().map(({ manifest }) => manifest)
      )
    ).toEqual([]);
  });
});
