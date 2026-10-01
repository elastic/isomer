/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { expect } from 'vitest';

// `toMatchFileSnapshot` is text-only. Bytes are compared in CI only, since a takumi or font bump changes every artifact; locally the file is rewritten and `git diff` is the review step.
export const expectArtifact = (path: string, bytes: Buffer): void => {
  if (!process.env.CI) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
    return;
  }
  if (!existsSync(path)) {
    throw new Error(`missing artifact ${path}; run vitest locally to write it`);
  }
  expect(bytes.equals(readFileSync(path)), path).toBe(true);
};
