/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The smallest container a command runs in: the lowest cgroup memory limit it
// exits 0 under, inside this repository built on Linux. The limit is the
// container's total memory, page cache and every process included, so run
// the command as one process, with no `pnpm` or shell wrapper. Report only;
// times under a container VM mean nothing, so it gives memory alone.
//
//   node scripts/container_floor.cjs [--profile name]... [--min 64] [--max 2048] [--step 8] [--tries 2] [--no-build] -- <command...>
//
// For example, one chart PNG with the Elastic Charts engine:
//
//   node scripts/container_floor.cjs -- node --expose-gc --disallow-code-generation-from-strings scripts/bench_charts.cjs --child one packages/isomer-charts-elastic/bench/engine.cjs 1 '' ''

const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const REPO = resolve(__dirname, '..');
const IMAGE = 'isomer-container-floor';
/** Every container this script starts carries this prefix, so cleanup touches no other. */
const PREFIX = `isomer-floor-${process.pid}-`;

/** What each profile adds to the run, as a Kibana-forked render process or a tuned host would. */
const PROFILES = {
  default: { NODE_OPTIONS: '', MALLOC_ARENA_MAX: '' },
  kibana: {
    NODE_OPTIONS: '--max-old-space-size=256 --max-semi-space-size=2',
    MALLOC_ARENA_MAX: '',
  },
  arena2: { NODE_OPTIONS: '', MALLOC_ARENA_MAX: '2' },
  'kibana-arena2': {
    NODE_OPTIONS: '--max-old-space-size=256 --max-semi-space-size=2',
    MALLOC_ARENA_MAX: '2',
  },
};

/**
 * The lowest limit, in MB, at which every one of `tries` attempts passes,
 * found by bisection between `min` and `max` to within `step`.
 * `attempt(limit)` resolves to `'pass'`, `'oom'` (the kernel killed it) or
 * `'heap'` (V8 ran out of heap); any other outcome is an error, which stops
 * the search. Returns what bounded it, or why there is no floor in range.
 */
const findFloor = async ({ min, max, step, tries, attempt }) => {
  const at = async (limit) => {
    for (let tryIndex = 0; tryIndex < tries; tryIndex += 1) {
      const outcome = await attempt(limit);
      if (outcome !== 'pass') {
        if (outcome !== 'oom' && outcome !== 'heap') {
          throw new Error(`${limit} MB: ${outcome}`);
        }
        return outcome;
      }
    }
    return 'pass';
  };
  const atMax = await at(max);
  if (atMax !== 'pass') {
    return { result: 'fails at every limit', failsAt: max, kind: atMax };
  }
  const atMin = await at(min);
  if (atMin === 'pass') {
    return { result: 'passes at the minimum', passesAt: min };
  }
  let low = min;
  let high = max;
  let kind = atMin;
  while (high - low > step) {
    const middle = Math.round((low + high) / 2 / step) * step;
    if (middle <= low || middle >= high) {
      break;
    }
    const outcome = await at(middle);
    if (outcome === 'pass') {
      high = middle;
    } else {
      low = middle;
      kind = outcome;
    }
  }
  return { result: 'floor', passesAt: high, failsAt: low, kind };
};

const docker = (args, options = {}) =>
  spawnSync('docker', args, {
    encoding: 'utf8',
    maxBuffer: 1 << 26,
    ...options,
  });

/** One run under `limit` MB, classified. */
const attemptIn = ({ command, profile }) => {
  let count = 0;
  return async (limit) => {
    count += 1;
    const name = `${PREFIX}${count}`;
    const env = Object.entries(PROFILES[profile]).flatMap(([key, value]) => [
      '-e',
      `${key}=${value}`,
    ]);
    const run = docker([
      'run',
      '--name',
      name,
      `--memory=${limit}m`,
      `--memory-swap=${limit}m`,
      ...env,
      IMAGE,
      ...command,
    ]);
    const inspected = docker([
      'inspect',
      '--format',
      '{{.State.OOMKilled}} {{.State.ExitCode}}',
      name,
    ]).stdout.trim();
    docker(['rm', '-f', name]);
    const [oomKilled, exitCode] = inspected.split(' ');
    if (exitCode === '0') {
      return 'pass';
    }
    if (/heap out of memory|Reached heap limit/.test(run.stderr)) {
      return 'heap';
    }
    if (oomKilled === 'true' || exitCode === '137') {
      return 'oom';
    }
    return `exit ${exitCode}:\n${run.stderr.slice(-2000)}`;
  };
};

const cleanUp = () => {
  const names = docker([
    'ps',
    '-aq',
    '--filter',
    `name=^${PREFIX}`,
  ]).stdout.trim();
  if (names !== '') {
    docker(['rm', '-f', ...names.split('\n')]);
  }
};

const describeHost = () => {
  const info = docker([
    'info',
    '--format',
    '{{.OSType}} {{.Architecture}}, {{.NCPU}} CPUs, {{.MemTotal}} bytes, kernel {{.KernelVersion}}',
  ]).stdout.trim();
  const node = docker(['run', '--rm', IMAGE, 'node', '-v']).stdout.trim();
  return `Docker ${info}; Node ${node} in \`scripts/container/Dockerfile\``;
};

const main = async () => {
  const args = process.argv.slice(2);
  const split = args.indexOf('--');
  if (split === -1 || split === args.length - 1) {
    throw new Error('Name the command after `--`.');
  }
  const options = args.slice(0, split);
  const command = args.slice(split + 1);
  const option = (name, fallback) => {
    const at = options.indexOf(name);
    return at === -1 ? fallback : Number(options[at + 1]);
  };
  const profiles = options.flatMap((arg, at) =>
    arg === '--profile' ? [options[at + 1]] : []
  );
  for (const profile of profiles) {
    if (!(profile in PROFILES)) {
      throw new Error(
        `${profile}: unknown profile; one of ${Object.keys(PROFILES).join(', ')}`
      );
    }
  }
  if (!options.includes('--no-build')) {
    const build = docker(
      ['build', '-q', '-f', 'scripts/container/Dockerfile', '-t', IMAGE, '.'],
      { cwd: REPO, stdio: ['ignore', 'ignore', 'inherit'] }
    );
    if (build.status !== 0) {
      throw new Error('docker build failed');
    }
  }
  process.on('SIGINT', () => {
    cleanUp();
    process.exit(130);
  });
  const settings = {
    min: option('--min', 64),
    max: option('--max', 2048),
    step: option('--step', 8),
    tries: option('--tries', 2),
  };
  const lines = [
    describeHost(),
    `Command: \`${command.join(' ')}\``,
    '',
    '| Profile | Floor | Bounded by |',
    '| --- | --- | --- |',
  ];
  try {
    for (const profile of profiles.length > 0
      ? profiles
      : Object.keys(PROFILES)) {
      const found = await findFloor({
        ...settings,
        attempt: attemptIn({ command, profile }),
      });
      const floor =
        found.result === 'floor'
          ? `${found.passesAt} MB (fails at ${found.failsAt})`
          : found.result === 'passes at the minimum'
            ? `under ${found.passesAt} MB`
            : `over ${found.failsAt} MB`;
      const by =
        found.kind === undefined
          ? ''
          : found.kind === 'heap'
            ? "V8's heap limit"
            : 'the kernel (cgroup OOM kill)';
      lines.push(`| \`${profile}\` | ${floor} | ${by} |`);
      process.stderr.write(`${profile}: ${floor}\n`);
    }
  } finally {
    cleanUp();
  }
  process.stdout.write(`${lines.join('\n')}\n`);
};

module.exports = { PROFILES, findFloor };

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
