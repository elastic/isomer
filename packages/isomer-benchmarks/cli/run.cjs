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
//   node cli/run.cjs <suite> [--runs 5] [--scenarios a,b] [--write <file>] [--json]
//   node cli/run.cjs report [--check]
//
// Run `pnpm build` first.

const { execFileSync, spawnSync } = require('node:child_process');
const { readFileSync, writeFileSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');

const PACKAGE = resolve(__dirname, '..');
const REPO = resolve(PACKAGE, '../..');
const SUITES = ['load', 'synthetic'];
const NODE_FLAGS = ['--disallow-code-generation-from-strings', '--expose-gc'];
const RESULTS_PAGE = join(PACKAGE, 'docs/results.md');

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

const helpers = () => require(join(PACKAGE, 'lib/cjs/index.js'));
const suiteOf = (name) => {
  if (!SUITES.includes(name)) {
    throw new Error(`${name}: unknown suite; one of ${SUITES.join(', ')}`);
  }
  return require(`./suites/${name}.cjs`);
};

const packageVersions = () =>
  Object.fromEntries(
    VERSIONED.map((name) => {
      // An `exports` map may hide `package.json`; walk up from the entry instead.
      let dir = dirname(require.resolve(name, { paths: [PACKAGE] }));
      for (;;) {
        try {
          const { name: found, version } = JSON.parse(
            readFileSync(join(dir, 'package.json'), 'utf8')
          );
          if (found === name) {
            return [name, version];
          }
        } catch {
          // No manifest here; keep walking.
        }
        const parent = dirname(dir);
        if (parent === dir) {
          return [name, 'unknown'];
        }
        dir = parent;
      }
    })
  );

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

const child = async (suiteName, scenario) => {
  const record = await suiteOf(suiteName).run(scenario);
  // `maxRSS` is in kilobytes.
  const peakRssMb = process.resourceUsage().maxRSS / 1024;
  process.stdout.write(JSON.stringify({ scenario, peakRssMb, ...record }));
};

const option = (args, name, fallback) => {
  const at = args.indexOf(name);
  return at === -1 ? fallback : args[at + 1];
};

const runSuite = (suiteName, args) => {
  const suite = suiteOf(suiteName);
  const runs = Number(option(args, '--runs', 5));
  const picked = option(args, '--scenarios', undefined)?.split(',');
  const scenarios =
    picked === undefined
      ? suite.scenarios
      : picked.map((name) => {
          const scenario = suite.scenarios.find((s) => s.name === name);
          if (scenario === undefined) {
            throw new Error(`${suiteName}: unknown scenario ${name}`);
          }
          return scenario;
        });

  const records = scenarios.flatMap(({ name }) =>
    Array.from({ length: runs }, () => {
      const run = spawnSync(
        process.execPath,
        [...NODE_FLAGS, __filename, '--child', suiteName, name],
        { encoding: 'utf8', maxBuffer: 1 << 24, cwd: PACKAGE }
      );
      if (run.status !== 0) {
        throw new Error(`${suiteName} ${name} run failed:\n${run.stderr}`);
      }
      return JSON.parse(run.stdout);
    })
  );

  const { describeEnvironment, summarize } = helpers();
  const result = {
    schemaVersion: 1,
    suite: suiteName,
    about: suite.about,
    environment: describeEnvironment({
      commit: commit(),
      packages: packageVersions(),
      nodeFlags: NODE_FLAGS,
    }),
    runsPerScenario: runs,
    measures: suite.measures,
    scenarios,
    runs: records,
    summary: summarize(records, scenarios, suite.measures),
  };

  const write = option(args, '--write', undefined);
  if (write !== undefined) {
    writeFileSync(resolve(write), `${JSON.stringify(result, null, 2)}\n`);
  }
  process.stdout.write(
    args.includes('--json')
      ? `${JSON.stringify(result, null, 2)}\n`
      : `${suiteSection(result)}\n`
  );
};

const suiteSection = (result) => {
  const { describeEnvironmentLine, toMarkdown } = helpers();
  const { suite, about, environment, runsPerScenario, scenarios } = result;
  const notes = suiteOf(suite).notes?.(result) ?? [];
  return [
    `## ${suiteOf(suite).title}`,
    '',
    about,
    '',
    `Median of ${runsPerScenario} runs per scenario. ${describeEnvironmentLine(environment)}.`,
    '',
    toMarkdown(result),
    '',
    // A scenario its name describes has no `about`.
    ...scenarios
      .filter(({ about: what }) => what !== '')
      .map(({ name, about: what }) => `- \`${name}\`: ${what}`),
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
    'navigation_title: Results',
    'description: What each Isomer package costs to load and run, from the committed benchmark baselines.',
    '---',
    '',
    '<!-- Generated by `pnpm --filter @elastic/isomer-benchmarks bench report` from `baselines/*.json`; do not edit. -->',
    '',
    '# Benchmark results',
    '',
    'Each table is generated from a committed baseline. [Measuring Isomer](index.md) says what each measure claims, and [Sizing a host](sizing.md) turns the numbers into guidance.',
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
        'docs/results.md differs from baselines/; run `pnpm --filter @elastic/isomer-benchmarks bench report`.\n'
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
    await child(args[1], args[2]);
  } else if (args[0] === 'report') {
    await report(args.slice(1));
  } else if (args[0] === undefined) {
    throw new Error(`Name a suite (${SUITES.join(', ')}) or \`report\`.`);
  } else {
    runSuite(args[0], args.slice(1));
  }
};

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
