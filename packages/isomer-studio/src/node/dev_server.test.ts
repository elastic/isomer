/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { isLoopbackHost } from './dev_server';

describe('isLoopbackHost', () => {
  it.each(['127.0.0.1:5179', 'localhost:5179', 'localhost', '[::1]:5179'])(
    'accepts %s',
    (host) => {
      expect(isLoopbackHost(host)).toBe(true);
    }
  );

  it.each([
    undefined,
    '',
    'attacker.example:5179',
    'localhost.attacker.example',
    '127.0.0.1.nip.io:5179',
  ])('rejects %s', (host) => {
    expect(isLoopbackHost(host)).toBe(false);
  });
});
