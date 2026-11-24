/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Runs a suite, one fresh Node process per scenario run, as a host loads the
// built CommonJS packages; or writes the docs' results page from the
// committed baselines.
//
//   node cli/run.cjs <suite> [--config <file>]... [--runs 5] [--scenarios a,b] [--write <file>] [--json]
//   node cli/run.cjs <suite> --check
//   node cli/run.cjs report [--check]
//   node cli/run.cjs smoke
//
// Paths are relative to where the command was started, even through
// `pnpm --filter`. Run `pnpm build` first.

const { execFileSync, spawnSync } = require('node:child_process');
const { readFileSync, writeFileSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');

const PACKAGE = resolve(__dirname, '..');
const REPO = resolve(PACKAGE, '../..');
const SUITES = ['load', 'synthetic', 'size'];
const NODE_FLAGS = ['--disallow-code-generation-from-strings', '--expose-gc'];
/** What a child writes its one JSON record to, apart from anything a package logs. */
const RECORD_FD = 3;
const RESULTS_PAGE = join(PACKAGE, 'docs/results.md');
/** The in-repo configs a suite measures when no `--config` is passed. */
const DEFAULT_CONFIGS = [
  'packages/isomer-primitives-slides/isomer-bench.config.cjs',
  'packages/isomer-primitives-charts/isomer-bench.config.cjs',
  'packages/isomer-charts-elastic/isomer-bench.config.cjs',
];

/** The versions the numbers depend on, resolved as the suites resolve them. */
const VERSIONED = [
  '@elastic/isomer-sdk',
  '@elastic/isomer-runtime',
  '@elastic/isomer-agent-tools',
  '@elastic/isomer-image-takumi',
  '@elastic/isomer-primitives-charts',
  '@elastic/isomer-charts-elastic',
  '@elastic/isomer-primitives-slides',
  'react',
  'react-dom',
  'zod',
];

/** Where `pnpm --filter` was started, so relative paths mean what the user typed. */
const startedIn = process.env.INIT_CWD ?? process.cwd();
const fromStart = (path) => resolve(startedIn, path);

const helpers = () => require(join(PACKAGE, 'lib/cjs/index.js'));
const suiteOf = (name) => {
  if (!SUITES.includes(name)) {
    throw new Error(`${name}: unknown suite; one of ${SUITES.join(', ')}`);
  }
  return require(`./suites/${name}.cjs`);
};

/** A package's version as resolved from `base`, or `null` when it isn't installed there. */
const versionFrom = (base, name) => {
  let dir;
  try {
    dir = dirname(require.resolve(name, { paths: [base] }));
  } catch {
    return null;
  }
  // An `exports` map may hide `package.json`; walk up from the entry instead.
  for (;;) {
    try {
      const { name: found, version } = JSON.parse(
        readFileSync(join(dir, 'package.json'), 'utf8')
      );
      if (found === name) {
        return version;
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

const commit = () => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: REPO,
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
};

// The child gets only the scenario's spec, never a config, so nothing a
// config imports is loaded where the suite measures.
const child = async (suiteName, scenario, spec) => {
  const record = await suiteOf(suiteName).run(JSON.parse(spec));
  // `maxRSS` is in kilobytes.
  const peakRssMb = process.resourceUsage().maxRSS / 1024;
  require('node:fs').writeSync(
    RECORD_FD,
    JSON.stringify({ scenario, peakRssMb, ...record })
  );
};

const option = (args, name, fallback) => {
  const at = args.indexOf(name);
  return at === -1 ? fallback : args[at + 1];
};

const options = (args, name) =>
  args.flatMap((arg, at) => (arg === name ? [args[at + 1]] : []));

const runsOption = (args) => {
  const raw = option(args, '--runs', '5');
  const runs = Number(raw);
  if (!Number.isInteger(runs) || runs < 1) {
    throw new Error(`--runs ${raw}: a whole number of runs, at least 1`);
  }
  return runs;
};

const loadConfigs = (paths) =>
  paths.map((path) => {
    const file = fromStart(path);
    const config = require(file);
    const problem = helpers().benchConfigProblem(config);
    if (problem !== undefined) {
      throw new Error(`${path}: ${problem}`);
    }
    return { ...config, dir: dirname(file) };
  });

const pick = (suiteName, planned, names) => {
  const seen = new Set();
  for (const { name } of planned) {
    if (seen.has(name)) {
      throw new Error(
        `${suiteName}: two scenarios are named ${name}; give each config its own name and entries`
      );
    }
    seen.add(name);
  }
  return names === undefined
    ? planned
    : names.map((name) => {
        const scenario = planned.find((each) => each.name === name);
        if (scenario === undefined) {
          throw new Error(`${suiteName}: unknown scenario ${name}`);
        }
        return scenario;
      });
};

const spawnChild = (suiteName, { name, spec }) => {
  const run = spawnSync(
    process.execPath,
    [
      ...NODE_FLAGS,
      __filename,
      '--child',
      suiteName,
      name,
      JSON.stringify(spec),
    ],
    {
      cwd: PACKAGE,
      stdio: ['ignore', 'ignore', 'pipe', 'pipe'],
      maxBuffer: 1 << 24,
    }
  );
  if (run.status !== 0) {
    throw new Error(`${suiteName} ${name} run failed:\n${run.output[2]}`);
  }
  return JSON.parse(run.output[RECORD_FD].toString('utf8'));
};

/** Plans, picks and prepares a suite's scenarios, then runs each `runs` times. */
const measure = async (suiteName, { runs, configs, names }) => {
  // Children inherit it, so React and others load their production builds, as
  // a production host's do; the environment records it from here.
  process.env.NODE_ENV = 'production';
  const suite = suiteOf(suiteName);
  const picked = pick(suiteName, await suite.scenarios(configs), names);
  const scenarios = (await suite.prepare?.(picked)) ?? picked;
  const records = scenarios.flatMap((scenario) =>
    Array.from({ length: runs }, () => spawnChild(suiteName, scenario))
  );
  return { suite, scenarios, records };
};

const runSuite = async (suiteName, args) => {
  const suite = suiteOf(suiteName);
  const runs = suite.deterministic ? 1 : runsOption(args);
  const passed = options(args, '--config');
  const check = args.includes('--check');
  if (check && (passed.length > 0 || args.includes('--scenarios'))) {
    throw new Error(
      "--check holds this repository's packs to bounds/; it takes no --config or --scenarios"
    );
  }
  if (passed.length > 0 && !suite.usesConfigs) {
    throw new Error(`${suiteName} measures its own pack; it takes no --config`);
  }
  const configs = suite.usesConfigs
    ? loadConfigs(
        passed.length > 0
          ? passed
          : DEFAULT_CONFIGS.map((path) => join(REPO, path))
      )
    : [];
  const { scenarios, records } = await measure(suiteName, {
    runs,
    configs,
    names: option(args, '--scenarios', undefined)?.split(','),
  });

  const { describeEnvironment, summarize } = helpers();
  const result = {
    schemaVersion: 1,
    suite: suiteName,
    about: suite.about,
    environment: describeEnvironment({
      commit: commit(),
      packages: Object.fromEntries(
        VERSIONED.map((name) => [name, versionFrom(PACKAGE, name)])
      ),
      nodeFlags: NODE_FLAGS,
    }),
    // Each pack's own SDK and runtime, which its rows load.
    packs: configs.map(({ name, build = 'built', dir }) => ({
      name,
      build,
      packages: Object.fromEntries(
        ['@elastic/isomer-sdk', '@elastic/isomer-runtime'].map((each) => [
          each,
          versionFrom(dir, each),
        ])
      ),
    })),
    runsPerScenario: runs,
    measures: suite.measures,
    scenarios: scenarios.map(({ name, about }) => ({ name, about })),
    runs: records,
    summary: summarize(records, scenarios, suite.measures),
  };

  const write = option(args, '--write', undefined);
  if (write !== undefined) {
    writeFileSync(fromStart(write), `${JSON.stringify(result, null, 2)}\n`);
  }
  if (check) {
    holdToBounds(suiteName, result);
    return;
  }
  process.stdout.write(
    args.includes('--json')
      ? `${JSON.stringify(result, null, 2)}\n`
      : `${suiteSection(result)}\n`
  );
};

const holdToBounds = (suiteName, { summary }) => {
  const bounds = JSON.parse(
    readFileSync(join(PACKAGE, 'bounds', `${suiteName}.json`), 'utf8')
  );
  const checks = helpers().checkBounds(summary, bounds);
  for (const { scenario, key, median, bound, ok } of checks) {
    process.stdout.write(
      `${ok ? '✓' : '✗'} ${scenario} ${key}: ${median.toFixed(1)}, bound ${bound}\n`
    );
  }
  const over = checks.filter(({ ok }) => !ok).length;
  if (over > 0) {
    process.stderr.write(
      `${over} of ${checks.length} over their bound in bounds/${suiteName}.json.\n`
    );
    process.exitCode = 1;
  }
};

/** One run of each suite's first and last scenario: does every suite still run? */
const smoke = async () => {
  for (const suiteName of SUITES) {
    const suite = suiteOf(suiteName);
    const configs = suite.usesConfigs
      ? loadConfigs(DEFAULT_CONFIGS.map((path) => join(REPO, path)))
      : [];
    const planned = await suite.scenarios(configs);
    const names = [...new Set([planned[0].name, planned.at(-1).name])];
    const { records } = await measure(suiteName, { runs: 1, configs, names });
    for (const { scenario } of records) {
      process.stdout.write(`✓ ${suiteName} ${scenario}\n`);
    }
  }
};

const suiteSection = (result) => {
  const { describeEnvironmentLine, summarize, tableText, toMarkdown } =
    helpers();
  const { suite, about, environment, runsPerScenario, scenarios, measures } =
    result;
  // Derived from the raw runs, so a saved summary can't drift from them.
  const summary = summarize(result.runs, scenarios, measures);
  const notes = suiteOf(suite).notes?.({ ...result, summary }) ?? [];
  return [
    `## ${suiteOf(suite).title}`,
    '',
    about,
    '',
    `${
      suiteOf(suite).deterministic
        ? 'Measured once'
        : `Median of ${runsPerScenario} runs per scenario`
    }. ${describeEnvironmentLine(environment)}.`,
    '',
    toMarkdown({ measures, scenarios, summary }),
    '',
    // A scenario its name describes has no `about`.
    ...scenarios
      .filter(({ about: what }) => what !== '')
      .map(({ name, about: what }) => `- \`${tableText(name)}\`: ${what}`),
    ...notes.flatMap((note) => ['', note]),
  ].join('\n');
};

const resultsPage = async () => {
  const sections = SUITES.map((suite) =>
    suiteSection(
      JSON.parse(
        readFileSync(join(PACKAGE, 'baselines', `${suite}.json`), 'utf8')
      )
    )
  );
  const page = [
    '---',
    'navigation_title: Raw results',
    'description: What each Isomer package costs to load and run, from the committed benchmark baselines.',
    '---',
    '',
    '<!-- Generated by `pnpm --filter @elastic/isomer-benchmarks bench report` from `baselines/*.json`; do not edit. -->',
    '',
    '# Raw benchmark results',
    '',
    'The raw tables, each generated from a committed baseline. For what they add up to, start with the [TL;DR](index.md); [Measuring Isomer](index.md#what-each-suite-claims) says what each measure claims, and [Sizing a host](sizing.md) turns the numbers into guidance.',
    '',
    ...sections.flatMap((section) => [section, '']),
  ].join('\n');
  const prettier = require(require.resolve('prettier', { paths: [REPO] }));
  return prettier.format(page, { parser: 'markdown' });
};

const report = async (args) => {
  const page = await resultsPage();
  if (args.includes('--check')) {
    if (readFileSync(RESULTS_PAGE, 'utf8') !== page) {
      process.stderr.write(
        'docs/results.md differs from baselines/; run `pnpm --filter @elastic/isomer-benchmarks bench report`, then `pnpm docs:assemble`.\n'
      );
      process.exitCode = 1;
    }
    return;
  }
  writeFileSync(RESULTS_PAGE, page);
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args[0] === '--child') {
    await child(args[1], args[2], args[3]);
  } else if (args[0] === 'report') {
    await report(args.slice(1));
  } else if (args[0] === 'smoke') {
    await smoke();
  } else if (args[0] === undefined) {
    throw new Error(
      `Name a suite (${SUITES.join(', ')}), \`report\` or \`smoke\`.`
    );
  } else {
    await runSuite(args[0], args.slice(1));
  }
};

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
