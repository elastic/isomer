/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runCli } from './cli/run';

const shutdown: Array<() => Promise<void>> = [];

process.exitCode = await runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  onDevServer: (server) => shutdown.push(server.close),
});

const stop = () => {
  void Promise.all(shutdown.map((close) => close())).then(() => process.exit());
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
