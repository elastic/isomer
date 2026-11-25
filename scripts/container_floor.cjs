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
// Bisection assumes a command that passes at a limit passes at every higher
// one; a command that sizes itself from the memory it sees may not.
//
// For example, one chart PNG with the Elastic Charts engine:
//
//   node scripts/container_floor.cjs -- node --expose-gc --disallow-code-generation-from-strings scripts/bench_charts.cjs --child one /isomer/packages/isomer-charts-elastic/bench/engine.cjs 1 '' ''

const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { resolve } = require('node:path');

const REPO = resolve(__dirname, '..');
const IMAGE = 'isomer-container-floor';
/** The Docker CLI; tests point it at a `.cjs` stub, which runs on this Node. */
const DOCKER = process.env.ISOMER_FLOOR_DOCKER ?? 'docker';
const dockerCommand = (args) =>
  DOCKER.endsWith('.cjs')
    ? [process.execPath, [DOCKER, ...args]]
    : [DOCKER, args];

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
 * What one run says about the limit: `'pass'`, `'oom'` (the kernel killed it)
 * or `'heap'` (V8 aborted out of heap), or an error message for anything else,
 * including a container that didn't exit or a kill the kernel didn't report.
 */
const classify = ({ status, oomKilled, exitCode, stderr }) => {
  if (status !== 'exited') {
    return `the container is ${status}, not exited`;
  }
  if (exitCode === 0) {
    return 'pass';
  }
  if (oomKilled) {
    return 'oom';
  }
  // An abort, as SIGABRT or as `--init` reports it, with V8's own diagnostic.
  if (
    (exitCode === 134 || exitCode === 133) &&
    /JavaScript heap out of memory|Reached heap limit/.test(stderr)
  ) {
    return 'heap';
  }
  return `exit ${exitCode}:\n${stderr.slice(-2000)}`;
};

/**
 * The lowest limit, in MB, at which every one of `tries` attempts passes,
 * found by bisection between `min` and `max` to within `step`.
 * `attempt(limit)` resolves to what {@link classify} returns; anything but a
 * pass or a memory failure stops the search.
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
    return { result: 'fails at the maximum', failsAt: max, kind: atMax };
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

/** The search options, refused before anything runs when they can't describe a search. */
const searchOptions = (options) => {
  const option = (name, fallback) => {
    const at = options.indexOf(name);
    const raw = at === -1 ? String(fallback) : options[at + 1];
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${name} ${raw}: a whole number of at least 1`);
    }
    return value;
  };
  const settings = {
    min: option('--min', 64),
    max: option('--max', 2048),
    step: option('--step', 8),
    tries: option('--tries', 2),
  };
  if (settings.min >= settings.max) {
    throw new Error(
      `--min ${settings.min} must be below --max ${settings.max}`
    );
  }
  return settings;
};

/** Kept of each stream, so a verbose command can't fill this process's heap. */
const KEEP = 64 * 1024;
const tail = (kept, chunk) => (kept + chunk).slice(-KEEP);

/** Docker calls in flight. An interrupt stops only attached runs, and waits for the rest. */
const running = new Map();
let shuttingDown = false;

const docker = (args, { cleanup = false } = {}) => {
  if (shuttingDown && !cleanup) {
    return Promise.reject(new Error('interrupted'));
  }
  const [file, argv] = dockerCommand(args);
  const child = spawn(file, argv, { cwd: REPO });
  child.attached = args[0] === 'start';
  const call = new Promise((done, fail) => {
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout = tail(stdout, chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr = tail(stderr, chunk);
    });
    child.on('error', (error) => {
      running.delete(child);
      fail(error);
    });
    child.on('close', (status) => {
      running.delete(child);
      done({ status, stdout: stdout.trim(), stderr });
    });
  });
  running.set(child, call);
  return call;
};

/** Containers this run created, by ID; cleanup removes these and no others. */
const created = new Set();
const runId = randomUUID().slice(0, 8);

/** A Docker call whose output is read as state, refused with Docker's own message when it fails. */
const probe = async (args) => {
  const result = await docker(args);
  if (result.status !== 0) {
    throw new Error(`docker ${args[0]} failed:\n${result.stderr}`);
  }
  return result;
};

/** One run of `command` in `image` under `limit` MB, classified. */
const attemptIn =
  ({ image, command, profile }) =>
  async (limit) => {
    const env = Object.entries(PROFILES[profile]).flatMap(([key, value]) => [
      '-e',
      `${key}=${value}`,
    ]);
    const create = await docker([
      'create',
      '--init',
      '--label',
      `isomer-floor=${runId}`,
      `--memory=${limit}m`,
      `--memory-swap=${limit}m`,
      ...env,
      image,
      ...command,
    ]);
    if (create.status !== 0) {
      throw new Error(`docker create failed:\n${create.stderr}`);
    }
    const id = create.stdout.split('\n').at(-1);
    created.add(id);
    try {
      const limits = await probe([
        'inspect',
        '--format',
        '{{.HostConfig.Memory}} {{.HostConfig.MemorySwap}}',
        id,
      ]);
      const bytes = String(limit * 1024 * 1024);
      if (limits.stdout !== `${bytes} ${bytes}`) {
        throw new Error(
          `${limit} MB: Docker set the limits to ${limits.stdout}, not ${bytes}`
        );
      }
      const started = await docker(['start', '--attach', id]);
      const inspected = await probe([
        'inspect',
        '--format',
        '{{.State.Status}} {{.State.OOMKilled}} {{.State.ExitCode}}',
        id,
      ]);
      const [status, oomKilled, exitCode] = inspected.stdout.split(' ');
      const outcome = classify({
        status,
        oomKilled: oomKilled === 'true',
        exitCode: Number(exitCode),
        stderr: started.stderr,
      });
      if (status !== 'exited') {
        return `${outcome}; docker start said:\n${started.stderr}`;
      }
      // `start --attach` exits with the container's code; anything else means the client lost it.
      if (outcome === 'pass' && started.status !== 0) {
        return `docker start exited ${started.status} for a container that exited 0:\n${started.stderr}`;
      }
      return outcome;
    } finally {
      await remove([id]);
    }
  };

/** Removes `ids`, saying which are left behind and how to retry when Docker can't. */
/** IDs removed or being removed, so two cleanups never remove one container twice. */
const handled = new Set();

const remove = async (requested) => {
  const ids = requested.filter((id) => !handled.has(id));
  ids.forEach((id) => handled.add(id));
  if (ids.length === 0) {
    return;
  }
  const result = await docker(['rm', '-f', ...ids], { cleanup: true }).catch(
    (error) => ({
      status: 1,
      stderr: String(error),
    })
  );
  if (result.status === 0) {
    ids.forEach((id) => created.delete(id));
    return;
  }
  ids.forEach((id) => handled.delete(id));
  process.stderr.write(
    `Couldn't remove ${ids.join(' ')}:\n${result.stderr}\nRetry with: docker rm -f ${ids.join(' ')}\n`
  );
};

/** Waits until no Docker call is in flight, including the cleanup an interrupted attempt starts. */
const drain = async () => {
  do {
    await Promise.allSettled([...running.values()]);
    await new Promise((done) => setImmediate(done));
  } while (running.size > 0);
};

/**
 * Removes every container this run made: those it holds IDs for, and any the
 * daemon created under this run's label before `docker create` returned one.
 */
const cleanUp = async () => {
  const listed = await docker(
    ['ps', '-aq', '--no-trunc', '--filter', `label=isomer-floor=${runId}`],
    { cleanup: true }
  ).catch(() => ({ status: 1, stdout: '' }));
  for (const id of listed.status === 0 ? listed.stdout.split('\n') : []) {
    if (id !== '') {
      created.add(id);
    }
  }
  await remove([...created]);
};

const describeHost = async (image) => {
  const { stdout: info } = await docker([
    'info',
    '--format',
    '{{.OSType}} {{.Architecture}}, {{.NCPU}} CPUs, {{.MemTotal}} bytes, kernel {{.KernelVersion}}',
  ]);
  const { stdout: node } = await docker(['run', '--rm', image, 'node', '-v']);
  return `Docker ${info}; Node ${node} in \`scripts/container/Dockerfile\`, image \`${image.slice(0, 19)}\``;
};

const main = async () => {
  const args = process.argv.slice(2);
  const split = args.indexOf('--');
  if (split === -1 || split === args.length - 1) {
    throw new Error('Name the command after `--`.');
  }
  const options = args.slice(0, split);
  const command = args.slice(split + 1);
  const settings = searchOptions(options);
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
  const { stdout: enforced } = await docker([
    'info',
    '--format',
    '{{.MemoryLimit}} {{.SwapLimit}}',
  ]);
  if (enforced !== 'true true') {
    throw new Error(
      `This Docker daemon can't enforce memory and swap limits (${enforced}).`
    );
  }
  if (!options.includes('--no-build')) {
    const build = await docker([
      'build',
      '-q',
      '-f',
      'scripts/container/Dockerfile',
      '-t',
      IMAGE,
      '.',
    ]);
    if (build.status !== 0) {
      throw new Error(`docker build failed:\n${build.stderr}`);
    }
  }
  // One image for the whole search, even if another checkout rebuilds the tag meanwhile.
  const { stdout: image, status } = await docker([
    'image',
    'inspect',
    '--format',
    '{{.Id}}',
    IMAGE,
  ]);
  if (status !== 0) {
    throw new Error(`No ${IMAGE} image; run without --no-build.`);
  }
  process.on('SIGINT', () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    // Stop attached runs; let a create or remove in flight finish, so its container is known.
    for (const [child] of running) {
      if (child.attached) {
        child.kill('SIGTERM');
      }
    }
    void drain()
      .then(cleanUp)
      .finally(() => process.exit(130));
  });

  const lines = [
    await describeHost(image),
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
        attempt: attemptIn({ image, command, profile }),
      });
      const floor =
        found.result === 'floor'
          ? `${found.passesAt} MB (fails at ${found.failsAt})`
          : found.result === 'passes at the minimum'
            ? `${found.passesAt} MB or less`
            : `fails at ${found.failsAt} MB, the maximum tried`;
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
    await cleanUp();
  }
  process.stdout.write(`${lines.join('\n')}\n`);
};

module.exports = { PROFILES, classify, findFloor, searchOptions };

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
