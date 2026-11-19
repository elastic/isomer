/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { issuesOf } from '../../schema/rules.fixtures';

describe('unsupported', () => {
  const failure = (source: unknown) => ({
    type: 'unsupported',
    title: 'x',
    reason: 'y',
    source,
  });

  it('takes provenance from any host, with opaque meta', () => {
    expect(
      issuesOf(
        'unsupported',
        failure({
          host: 'an-agent',
          capturedAt: '2026-11-03T09:15:00.000Z',
          meta: { conversation: 'c1', turn: 4 },
        })
      )
    ).toEqual([]);
  });

  it.each([
    { host: 'kibana', capturedAt: 'invalid' },
    { capturedAt: '2026-11-03T09:15:00.000Z' },
    {
      host: 'kibana',
      capturedAt: '2026-11-03T09:15:00.000Z',
      savedObjectId: 'dashboard-1',
    },
    {
      host: 'kibana',
      capturedAt: '2026-11-03T09:15:00.000Z',
      materializer: 'lens',
    },
  ])('rejects invalid or former top-level provenance: %j', (source) => {
    expect(issuesOf('unsupported', failure(source)).length).toBeGreaterThan(0);
  });

  it('rejects a script link', () => {
    expect(
      issuesOf('unsupported', {
        type: 'unsupported',
        title: 'x',
        reason: 'y',
        link: { href: 'javascript:alert(1)', label: 'Open' },
      }).map(({ path }) => path)
    ).toEqual(['link.href']);
  });
});
