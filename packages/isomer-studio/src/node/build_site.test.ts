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

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { componentsPack } from '../fixtures/components_pack';

import { BUILD_MARKER, prepareOut, prerenderPngs } from './build_site';

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

describe('prerenderPngs', () => {
  it('reports an example the composer rejects and prerenders the rest', async () => {
    const runtime = createIsomerRuntime<unknown, StyledRenderContext>({
      packs: [componentsPack],
    });
    const { manifest, failures } = await prerenderPngs(
      {
        runtime,
        compose: (nodes, { theme }) => {
          if (nodes.some(({ type }) => type === 'callout')) {
            throw new Error('No callouts here.');
          }
          return { type: 'view', body: [...nodes], theme };
        },
      },
      () => Promise.resolve(Buffer.from('png')),
      out
    );

    expect(failures.length).toBeGreaterThan(0);
    expect(
      failures.every(
        (failure) =>
          failure.startsWith('callout › ') &&
          failure.endsWith(': No callouts here.')
      )
    ).toBe(true);
    const primitives = new Set(
      Object.values(manifest.entries).map(({ primitive }) => primitive)
    );
    expect(primitives.has('callout')).toBe(false);
    expect(primitives.has('divider')).toBe(true);
  });
});
