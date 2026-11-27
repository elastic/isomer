/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// `bench compare`: runs suites against the installed build of one package and
// another build of it, swapping them in place between runs and alternating
// which goes first, then reports each side's medians and the change. With a
// chart engine among the configs, it also checks that the engine draws every
// charts-pack example the same with either build.

const { execFileSync } = require('node:child_process');
const {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { basename, dirname, join } = require('node:path');

const ASIDE = '.isomer-bench-installed';
const SWAPPED = '.isomer-bench-swapped';

/** The directory holding package `name` as resolved from `base`, or `null`. */
const packageDir = (base, name) => {
  let dir;
  try {
    dir = dirname(require.resolve(name, { paths: [base] }));
  } catch {
    return null;
  }
  // An `exports` map may hide `package.json`; walk up from the entry instead.
  for (;;) {
    try {
      if (
        JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name ===
        name
      ) {
        return realpathSync(dir);
      }
    } catch {
      // No manifest here; keep walking.
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
};

const manifest = (dir) =>
  JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));

/** The other build as a directory: given, or extracted from an npm tarball. */
const otherBuild = (path, name) => {
  let dir = path;
  if (!statSync(path).isDirectory()) {
    const into = mkdtempSync(join(tmpdir(), 'isomer-bench-swap-'));
    execFileSync('tar', ['-xzf', path, '-C', into]);
    dir = join(into, 'package');
  }
  const found = manifest(dir).name;
  if (found !== name) {
    throw new Error(`--swap ${name}=${path}: that build is ${found}`);
  }
  return dir;
};

/**
 * Swaps the other build in for each installed copy of a package by renaming,
 * so the installed one is never deleted: it waits beside its place until
 * `restore`.
 */
const swapper = (installed, other) => {
  for (const dir of installed) {
    for (const suffix of [ASIDE, SWAPPED]) {
      if (existsSync(`${dir}${suffix}`)) {
        throw new Error(
          `${dir}${suffix} exists, left by a compare that didn't finish. If ${dir} is missing, move ${dir}${ASIDE} back to it; then remove ${dir}${SWAPPED}.`
        );
      }
    }
  }
  for (const dir of installed) {
    cpSync(other, `${dir}${SWAPPED}`, {
      recursive: true,
      verbatimSymlinks: true,
    });
  }
  let side = 'a';
  const use = (wanted) => {
    if (wanted === side) {
      return;
    }
    for (const dir of installed) {
      if (wanted === 'b') {
        renameSync(dir, `${dir}${ASIDE}`);
        renameSync(`${dir}${SWAPPED}`, dir);
      } else {
        renameSync(dir, `${dir}${SWAPPED}`);
        renameSync(`${dir}${ASIDE}`, dir);
      }
    }
    side = wanted;
  };
  const restore = () => {
    use('a');
    // Only the copy this run made.
    for (const dir of installed) {
      rmSync(`${dir}${SWAPPED}`, { recursive: true, force: true });
    }
  };
  return { use, restore };
};

const compare = async (args, deps) => {
  const {
    DEFAULT_CONFIGS,
    REPO,
    fromStart,
    helpers,
    loadConfigs,
    option,
    options,
    pick,
    revision,
    runsOption,
    spawnChild,
    suiteOf,
  } = deps;
  const {
    compareSummaries,
    comparisonToMarkdown,
    describeEnvironment,
    describeEnvironmentLine,
    parityProblems,
    parsePair,
    summarize,
  } = helpers();

  const suiteNames = (args[0] ?? '').split(',').filter(Boolean);
  if (suiteNames.length === 0 || args[0].startsWith('--')) {
    throw new Error('compare: name the suites to run, such as load,charts');
  }
  const suites = suiteNames.map((name) => [name, suiteOf(name)]);
  if (args.includes('--check')) {
    throw new Error('compare takes no --check: it reports, it gates nothing');
  }
  const swaps = options(args, '--swap');
  if (swaps.length !== 1) {
    throw new Error('compare: give one --swap <package>=<directory or .tgz>');
  }
  const { name, value: path } = parsePair(swaps[0], '--swap');
  const aliases = Object.fromEntries(
    options(args, '--alias').map((raw) => {
      const pair = parsePair(raw, '--alias');
      return [pair.name, pair.value];
    })
  );
  const runs = runsOption(args, 5);
  const passed = options(args, '--config');
  const configs = loadConfigs(
    passed.length > 0 ? passed : DEFAULT_CONFIGS.map((each) => join(REPO, each))
  );
  const names = option(args, '--scenarios', undefined)?.split(',');

  const other = otherBuild(fromStart(path), name);
  const installed = [
    ...new Set(
      [deps.PACKAGE, ...configs.map(({ dir }) => dir)]
        .map((base) => packageDir(base, name))
        .filter((dir) => dir !== null)
    ),
  ];
  if (installed.length === 0) {
    throw new Error(`--swap ${name}: not installed for any config`);
  }
  const versionA = manifest(installed[0]).version;
  const versionB = manifest(other).version;

  process.env.NODE_ENV = 'production';
  const plans = [];
  for (const [suiteName, suite] of suites) {
    if (!suite.usesConfigs && passed.length > 0) {
      throw new Error(
        `${suiteName} measures its own pack; it takes no --config`
      );
    }
    const planned = await suite.scenarios(suite.usesConfigs ? configs : []);
    const picked =
      names === undefined
        ? planned
        : pick(
            suiteName,
            planned,
            names.filter((each) => planned.some((row) => row.name === each))
          );
    plans.push({
      suiteName,
      suite,
      scenarios: (await suite.prepare?.(picked)) ?? picked,
      runs: suite.deterministic ? 1 : runs,
    });
  }
  if (names !== undefined) {
    const known = new Set(
      plans.flatMap(({ scenarios }) => scenarios.map((each) => each.name))
    );
    const unknown = names.filter((each) => !known.has(each));
    if (unknown.length > 0) {
      throw new Error(
        `compare: no suite named has scenario ${unknown.join(', ')}`
      );
    }
  }
  const engines = configs.filter(({ charts }) => charts?.engine !== undefined);
  const aliasing =
    Object.keys(aliases).length === 0
      ? {}
      : {
          flags: ['--require', join(__dirname, 'alias.cjs')],
          env: { ISOMER_BENCH_ALIAS: JSON.stringify(aliases) },
        };
  const sideOptions = (side) => (side === 'b' ? aliasing : {});

  const before = revision();
  const records = { a: {}, b: {} };
  const drawn = { a: {}, b: {} };
  const swap = swapper(installed, other);
  const stop = () => {
    swap.restore();
    process.exit(130);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    const rounds = Math.max(...plans.map((plan) => plan.runs));
    for (let round = 0; round < rounds; round += 1) {
      // Alternate which side goes first, so drift over the run falls on both.
      for (const side of round % 2 === 0 ? ['a', 'b'] : ['b', 'a']) {
        swap.use(side);
        for (const { suiteName, scenarios, runs: own } of plans) {
          if (round >= own) {
            continue;
          }
          for (const scenario of scenarios) {
            (records[side][suiteName] ??= []).push(
              spawnChild(suiteName, scenario, sideOptions(side))
            );
          }
        }
      }
    }
    for (const side of ['a', 'b']) {
      swap.use(side);
      for (const config of engines) {
        const { drawn: each } = spawnChild(
          'parity',
          {
            name: `${config.name}:parity`,
            spec: {
              base: config.dir,
              engine: join(config.dir, config.charts.engine),
            },
          },
          sideOptions(side)
        );
        for (const [example, hashes] of Object.entries(each)) {
          drawn[side][`${config.name}:${example}`] = hashes;
        }
      }
    }
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    swap.restore();
  }
  const after = revision();

  const labels = { a: 'Installed', b: 'Swapped' };
  const aliasText = Object.entries(aliases)
    .map(([from, to]) => `\`${from}\` as \`${to}\``)
    .join(', ');
  const environment = describeEnvironment({
    commit: before.commit,
    ...(before.uncommitted === undefined
      ? {}
      : {
          uncommitted:
            before.uncommitted ||
            after.uncommitted === true ||
            before.commit !== after.commit,
        }),
    packages: { [name]: versionA },
    nodeFlags: deps.NODE_FLAGS,
  });
  const sections = plans.map(({ suiteName, suite, scenarios, runs: own }) => {
    const summaries = {
      a: summarize(records.a[suiteName] ?? [], scenarios, suite.measures),
      b: summarize(records.b[suiteName] ?? [], scenarios, suite.measures),
    };
    return {
      suite: suiteName,
      title: suite.title,
      runsPerScenario: own,
      scenarios: scenarios.map(({ name: each, about }) => ({
        name: each,
        about,
      })),
      measures: suite.measures,
      summaries,
      comparison: compareSummaries(
        summaries.a,
        summaries.b,
        scenarios,
        suite.measures
      ),
    };
  });
  const problems = parityProblems(drawn.a, drawn.b, labels);
  const result = {
    schemaVersion: 1,
    compare: {
      package: name,
      installed: { version: versionA, dirs: installed },
      swapped: { version: versionB, from: fromStart(path), aliases },
    },
    environment,
    suites: sections.map((section) => ({
      ...section,
      runs: {
        a: records.a[section.suite] ?? [],
        b: records.b[section.suite] ?? [],
      },
    })),
    parity: {
      examples: Object.keys(drawn.a).length,
      problems,
    },
  };

  const write = option(args, '--write', undefined);
  if (write !== undefined) {
    writeFileSync(fromStart(write), `${JSON.stringify(result, null, 2)}\n`);
  }
  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(
      [
        `# ${name}: installed against swapped`,
        '',
        `Installed: ${name} ${versionA}. Swapped: ${basename(path)} (${name} ${versionB})${
          aliasText === '' ? '' : `, resolving ${aliasText}`
        }. Runs alternate between the two, each side first in turn. ${describeEnvironmentLine(environment)}.`,
        '',
        ...sections.flatMap(
          ({ title, runsPerScenario, scenarios, measures, comparison }) => [
            `## ${title}`,
            '',
            `Median of ${runsPerScenario} run${runsPerScenario === 1 ? '' : 's'} per scenario and side.`,
            '',
            comparisonToMarkdown({ measures, scenarios, comparison, labels }),
            '',
          ]
        ),
        '## Drawing parity',
        '',
        engines.length === 0
          ? 'No config names a chart engine, so nothing was drawn.'
          : problems.length === 0
            ? `All ${Object.keys(drawn.a).length} examples drew the same markup and PNG with either build.`
            : [
                `${problems.length} of ${Object.keys({ ...drawn.a, ...drawn.b }).length} examples differ:`,
                '',
                ...problems.map((problem) => `- ${problem}`),
              ].join('\n'),
        '',
      ].join('\n')
    );
  }
  if (problems.length > 0) {
    process.stderr.write(
      `${problems.length} examples drew differently with ${basename(path)}.\n`
    );
    process.exitCode = 1;
  }
};

module.exports = { compare };
