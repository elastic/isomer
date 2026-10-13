/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';

import { sha256Hex } from './sha256';

const nodeSha256 = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');

describe('sha256Hex', () => {
  it.each([0, 1, 55, 56, 63, 64, 65, 119, 120, 1000])(
    'matches node:crypto for %i bytes',
    (length) => {
      const bytes = Uint8Array.from({ length }, (_, i) => (i * 31 + 7) % 256);
      expect(sha256Hex(bytes)).toBe(nodeSha256(bytes));
    }
  );

  it('hashes UTF-8 text', () => {
    const bytes = new TextEncoder().encode('{"body":"Café — 数据 🚀"}');
    expect(sha256Hex(bytes)).toBe(nodeSha256(bytes));
  });

  it('hashes the empty input to the known digest', () => {
    expect(sha256Hex(new Uint8Array())).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });
});
