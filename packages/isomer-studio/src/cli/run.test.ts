/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment node

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { openBrowser, runCli } from './run';

describe('openBrowser', () => {
  it('reports an opener that does not exist instead of throwing', async () => {
    const error = await new Promise<Error>((resolve) =>
      openBrowser(
        'http://127.0.0.1:5179/',
        resolve,
        'isomer-studio-missing-opener'
      )
    );

    expect(error).toMatchObject({ code: 'ENOENT' });
  });
});

describe('runCli', () => {
  it('registers project resolution before init imports the pack entry', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'isomer-studio-init-'));
    try {
      writeFileSync(join(dir, 'package.json'), '{"name":"pack"}');
      const calls: string[] = [];
      const onConfig = vi.fn((path: string) => calls.push(`onConfig ${path}`));
      const stderr = (text: string) => calls.push(`stderr ${text}`);

      const code = await runCli(['init', '--cwd', dir, '--loader', 'none'], {
        cwd: dir,
        stdout: () => undefined,
        stderr,
        onConfig,
      });

      expect(code).toBe(1);
      expect(onConfig).toHaveBeenCalledExactlyOnceWith(
        join(dir, 'package.json')
      );
      expect(calls[0]).toBe(`onConfig ${join(dir, 'package.json')}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
