/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { workspacePackages } from './workspace_packages.js';

for (const pkg of workspacePackages()) {
  execFileSync(
    'pnpm',
    ['exec', 'tsc', '-p', join(pkg.dir, 'tsconfig.build.cjs.json')],
    { stdio: 'inherit' }
  );
}
