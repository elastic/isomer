/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment node

import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BUILD_MARKER, prepareOut } from './build_site';

let out: string;

beforeEach(() => {
  out = mkdtempSync(join(tmpdir(), 'isomer-studio-out-'));
});

afterEach(() => {
  rmSync(out, { force: true, recursive: true });
});

describe('prepareOut', () => {
  it('refuses a non-empty directory with an index.html but no build marker', () => {
    writeFileSync(join(out, 'index.html'), '<!doctype html>');
    writeFileSync(join(out, 'about.html'), '<!doctype html>');

    expect(() => prepareOut(out)).toThrow(
      'is not empty and holds no Studio build'
    );
    expect(readdirSync(out).sort()).toEqual(['about.html', 'index.html']);
  });

  it('clears a previous build and marks the new one', () => {
    writeFileSync(join(out, BUILD_MARKER), '');
    writeFileSync(join(out, 'stale.js'), '');

    prepareOut(out);

    expect(readdirSync(out)).toEqual([BUILD_MARKER]);
  });

  it('creates and marks a directory that does not exist', () => {
    const fresh = join(out, 'site');

    prepareOut(fresh);

    expect(existsSync(join(fresh, BUILD_MARKER))).toBe(true);
  });
});
