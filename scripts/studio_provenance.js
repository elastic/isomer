/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { workspacePackages } from './workspace_packages.js';

const SHA = /^[a-f0-9]{40}$/;
const INTEGER = /^[1-9][0-9]*$/;

/** Expected identity comes from the workflow event, never from downloaded output. */
export const studioIdentity = (env) => {
  const {
    STUDIO_HEAD_SHA: headSha,
    GITHUB_REPOSITORY: repository,
    GITHUB_RUN_ID: runId,
    GITHUB_RUN_ATTEMPT: runAttempt,
    STUDIO_PR_NUMBER: prNumber,
  } = env;
  if (
    !SHA.test(headSha ?? '') ||
    !/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') ||
    !INTEGER.test(runId ?? '') ||
    !INTEGER.test(runAttempt ?? '') ||
    (prNumber !== '' && !INTEGER.test(prNumber ?? ''))
  ) {
    throw new Error('Invalid Studio workflow identity.');
  }
  return { headSha, repository, runId, runAttempt, prNumber: prNumber || null };
};

/** Compares diagnostics with independently supplied trusted expectations. */
export const assertStudioProvenance = (metadata, expected) => {
  for (const [field, value] of Object.entries(expected)) {
    if (metadata?.[field] !== value) {
      throw new Error(`Studio provenance mismatch: ${field}.`);
    }
  }
  if (
    metadata.checkoutSha !== expected.headSha ||
    metadata.config !== 'isomer-studio.config.ts' ||
    metadata.data !== 'examples-only; no live data' ||
    metadata.images !== false ||
    typeof metadata.base !== 'string' ||
    !metadata.base.startsWith('/') ||
    !metadata.base.endsWith('/') ||
    metadata.version !== 1
  ) {
    throw new Error(
      'Studio provenance does not describe the browser-only head build.'
    );
  }
};

const escape = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export const writeStudioProvenance = (out, env = process.env) => {
  const identity = studioIdentity(env);
  const checkoutSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  const metadata = {
    version: 1,
    ...identity,
    checkoutSha,
    config: 'isomer-studio.config.ts',
    images: false,
    base: env.STUDIO_BROWSER_BASE,
    data: 'examples-only; no live data',
    packages: Object.fromEntries(
      workspacePackages().map(({ manifest }) => [
        manifest.name,
        manifest.version,
      ])
    ),
  };
  assertStudioProvenance(metadata, identity);
  writeFileSync(
    join(out, 'build.json'),
    `${JSON.stringify(metadata, null, 2)}\n`
  );
  const index = join(out, 'index.html');
  const html = readFileSync(index, 'utf8');
  const label = escape(
    `Review ${identity.headSha} / run ${identity.runId}-${identity.runAttempt} / examples only, no live data`
  );
  writeFileSync(
    index,
    html.replace(
      '</body>',
      `<aside aria-label="Build provenance" style="position:fixed;bottom:0;right:0;z-index:10000;background:#fff;color:#111;font:11px monospace;max-width:100%;overflow-wrap:anywhere"><a href="build.json">${label}</a></aside></body>`
    )
  );
  return metadata;
};

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  writeStudioProvenance(resolve(process.argv[2] ?? '.artifacts/studio'));
}
