/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

const workflow = readFileSync(
  new URL('../.github/workflows/codex-preview.yml', import.meta.url),
  'utf8'
);
const download = workflow
  .split("            const { createHash } = require('node:crypto');")[1]
  ?.split('\n      - name: Validate')[0];
if (!download) {
  throw new Error('Missing Studio download gate.');
}
const downloadCode = `const { createHash } = require('node:crypto');${download.replace(/^ {12}/gm, '')}`;
const extraction = workflow
  .split("          python3 - <<'PY'\n")[1]
  ?.split('\n          PY')[0]
  ?.replace(/^ {10}/gm, '');
if (!extraction) {
  throw new Error('Missing Studio archive gate.');
}
const head = '0123456789abcdef0123456789abcdef01234567';
const env = {
  HEAD_SHA: head,
  RUN_ID: '123',
  RUN_ATTEMPT: '2',
  PR_NUMBER: '280',
  REPOSITORY: 'elastic/isomer',
};
const context = {
  repo: { owner: 'elastic', repo: 'isomer' },
  runId: 123,
  payload: { pull_request: { number: 280 } },
};

const invokeDownload = async ({
  digest,
  artifacts,
  stale = false,
  apiError = false,
} = {}) => {
  const bytes = Buffer.from('independently identified archive');
  const writeFileSync = vi.fn();
  const github = {
    rest: {
      pulls: {
        get: vi.fn().mockResolvedValue({
          data: {
            state: 'open',
            head: {
              sha: stale ? 'f'.repeat(40) : head,
              repo: { full_name: 'elastic/isomer' },
            },
          },
        }),
      },
      actions: {
        getWorkflowRun: vi.fn().mockResolvedValue({
          data: {
            event: 'pull_request',
            path: '.github/workflows/codex-preview.yml',
            repository: { full_name: 'elastic/isomer' },
            run_attempt: 2,
          },
        }),
        listWorkflowRunArtifacts: vi.fn(),
        downloadArtifact: vi.fn().mockResolvedValue({ data: bytes }),
      },
    },
    paginate: apiError
      ? vi.fn().mockRejectedValue(new Error('API denied'))
      : vi.fn().mockResolvedValue(
          artifacts ?? [
            {
              id: 456,
              name: `studio-${head}-123-2`,
              expired: false,
              digest:
                digest ??
                `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
            },
          ]
        ),
  };
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  await new AsyncFunction(
    'github',
    'context',
    'require',
    'core',
    'process',
    'Buffer',
    downloadCode
  )(
    github,
    context,
    (name) => (name === 'node:crypto' ? { createHash } : { writeFileSync }),
    { summary: { addRaw: () => ({ write: vi.fn() }) } },
    { env },
    Buffer
  );
  return writeFileSync;
};

describe('trusted Studio workflow download', () => {
  it('downloads the uniquely named current-run artifact and verifies the API digest', async () => {
    expect(await invokeDownload()).toHaveBeenCalledWith(
      'studio.zip',
      expect.any(Buffer)
    );
  });
  it('rejects stale PR heads', async () => {
    await expect(invokeDownload({ stale: true })).rejects.toThrow('stale');
  });
  it('rejects changed archive bytes', async () => {
    await expect(
      invokeDownload({ digest: `sha256:${'0'.repeat(64)}` })
    ).rejects.toThrow('digest mismatch');
  });
  it('does not convert API failure into missing-artifact success', async () => {
    await expect(invokeDownload({ apiError: true })).rejects.toThrow(
      'API denied'
    );
  });
  it('rejects missing artifacts', async () => {
    await expect(invokeDownload({ artifacts: [] })).rejects.toThrow(
      'Missing, ambiguous'
    );
  });
});

const metadata = {
  version: 1,
  headSha: head,
  checkoutSha: head,
  repository: 'elastic/isomer',
  runId: '123',
  runAttempt: '2',
  prNumber: '280',
  config: 'isomer-studio.config.ts',
  images: false,
  data: 'examples-only; no live data',
};
const extract = (change = {}, extra = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-archive-'));
  try {
    const make = spawnSync(
      'python3',
      [
        '-c',
        `
import json, sys, zipfile
with zipfile.ZipFile('studio.zip', 'w') as archive:
    for name, body in json.loads(sys.stdin.read()).items():
        archive.writestr(name, body)
`,
      ],
      {
        cwd: dir,
        input: JSON.stringify({
          'build.json': JSON.stringify({ ...metadata, ...change }),
          'index.html': '<html></html>',
          ...extra,
        }),
      }
    );
    expect(make.status).toBe(0);
    return spawnSync('python3', ['-c', extraction], {
      cwd: dir,
      env: { ...process.env, ...env },
      encoding: 'utf8',
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

describe('trusted Studio archive gate', () => {
  it('accepts a browser-only archive matching independently supplied event identity', () => {
    expect(extract().status).toBe(0);
  });
  it.each([
    { headSha: 'f'.repeat(40) },
    { checkoutSha: 'f'.repeat(40) },
    { repository: 'attacker/isomer' },
    { runId: '124' },
    { runAttempt: '1' },
    { prNumber: '281' },
    { images: 0 },
  ])('rejects forged metadata %j', (change) => {
    const result = extract(change);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('provenance mismatch');
  });
  it.each(['../outside', '/absolute', 'folder\\escape', 'png/image.png'])(
    'rejects unsafe/non-browser output %s',
    (file) => {
      expect(extract({}, { [file]: 'bad' }).status).not.toBe(0);
    }
  );
});
