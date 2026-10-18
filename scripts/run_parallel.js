/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Runs each argument as a `pnpm` command at once, prints each one's output whole as it finishes, and fails if any failed. Unlike `pnpm run "/regex/"`, a failure neither stops the others nor exits 0 under `--no-bail`.

import { spawn } from 'node:child_process';

const commands = process.argv.slice(2);
const env = process.stdout.isTTY
  ? { ...process.env, FORCE_COLOR: '1' }
  : process.env;

const run = (command) =>
  new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('pnpm', command.split(/\s+/), {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('close', (code) => {
      const seconds = ((Date.now() - started) / 1000).toFixed(0);
      const status = code === 0 ? 'passed' : `failed (exit ${code})`;
      process.stdout.write(
        `\n── pnpm ${command}: ${status} in ${seconds}s ──\n${output}`
      );
      resolve({ command, code });
    });
  });

const failed = (await Promise.all(commands.map(run))).filter(
  ({ code }) => code !== 0
);
if (failed.length > 0) {
  console.error(
    `\nFailed: ${failed.map(({ command }) => `pnpm ${command}`).join(', ')}`
  );
  process.exit(1);
}
