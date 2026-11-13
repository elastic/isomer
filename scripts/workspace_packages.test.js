/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { isPublishable, workspacePackages } from './workspace_packages.js';

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
