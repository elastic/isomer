/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { repoRoot, workspacePackages } from './workspace_packages.js';

const writeJson = (path, value) => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

/** Keep every workspace package on the same version as the release. */
export const prepare = (_pluginConfig, context) => {
  const { nextRelease, logger } = context;
  const { version } = nextRelease;

  const rootPath = join(repoRoot, 'package.json');
  const rootManifest = JSON.parse(readFileSync(rootPath, 'utf-8'));
  rootManifest.version = version;
  writeJson(rootPath, rootManifest);

  for (const pkg of workspacePackages()) {
    pkg.manifest.version = version;
    writeJson(join(pkg.dir, 'package.json'), pkg.manifest);
    logger.log('Set %s to %s', pkg.manifest.name, version);
  }
};

/** Publishes every workspace package that is not `private`. */
export const publish = (_pluginConfig, context) => {
  const { logger, nextRelease } = context;
  const names = workspacePackages()
    .filter(({ manifest }) => manifest.private !== true)
    .map(({ manifest }) => manifest.name);
  logger.log('Publishing %s at %s', names.join(', '), nextRelease.version);
  execFileSync(
    'pnpm',
    [
      '-r',
      ...names.flatMap((name) => ['--filter', name]),
      'publish',
      '--access',
      'public',
      '--no-git-checks',
    ],
    { stdio: 'inherit', cwd: repoRoot }
  );
};
