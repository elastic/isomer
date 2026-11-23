/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A `packedFiles` pattern as a regular expression, where `*` matches within one path segment. */
const patternToRegExp = (pattern) =>
  new RegExp(
    `^${pattern
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('[^/]*')}$`
  );

/**
 * Whether `entry` matches one of `patterns`.
 *
 * @param {string} entry
 * @param {readonly string[]} [patterns]
 */
export const isPackedFile = (entry, patterns = []) =>
  patterns.some((pattern) => patternToRegExp(pattern).test(entry));

/**
 * The patterns in a manifest's `isomer.packedFiles` that no tarball entry matches.
 *
 * @param {readonly string[]} entries
 * @param {readonly string[]} [patterns]
 */
export const missingPackedFiles = (entries, patterns = []) =>
  patterns.filter((pattern) => {
    const matcher = patternToRegExp(pattern);
    return !entries.some((entry) => matcher.test(entry));
  });

/**
 * Names Kibana's build deletes from `node_modules`, wherever they sit in a
 * package and whether a file or a directory: the single-segment patterns of
 * `CleanExtraFilesFromModules` in Kibana's `src/dev/build/tasks/clean_tasks.ts`,
 * which match without regard to case. `*` and `{a,b}` are as a glob's.
 */
export const KIBANA_PRUNED_NAMES = [
  'test',
  'tests',
  'jest.config.js',
  '__tests__',
  '*.test.js',
  '*.snap',
  'coverage',
  'doc',
  'docs',
  'README',
  'README.*',
  'example',
  'examples',
  'demo',
  'samples',
  '.bin',
  'bin',
  '*.map',
  '@types',
  'Gruntfile.js',
  'gulpfile.js',
  '*.ts',
  '*.tsx',
  'tsconfig.json',
  'babel.config.*',
  '.vscode',
  '.idea',
  '.git',
  '.github',
  'karma.conf.ci.js',
  'karma.conf.js',
  'karma-ci.conf.js',
  'package-lock.json',
  'component.json',
  'bower.json',
  '.pnpm',
  '*.{png,jpg,jpeg,gif,webp,zip,7z,rar,tar,tgz,gz,cc,pl,py,h,xml,html}',
  '*.development.js',
  '*.dev.js',
  'benchmark',
  'benchmarks',
  'benchmark.js',
  'benchmarks.js',
];

const prunedName = new RegExp(
  `^(${KIBANA_PRUNED_NAMES.map((pattern) =>
    pattern
      .replace(/[.+?^$()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\{([^}]*)\}/g, (_, names) => `(${names.replace(/,/g, '|')})`)
  ).join('|')})$`,
  'i'
);

const RUNTIME_CODE = /\.(c|m)?js$|\.json$|\.node$|\.wasm$/;

const binTargets = (bin) =>
  (typeof bin === 'string' ? [bin] : Object.values(bin ?? {})).map((target) =>
    target.replace(/^\.\//, '')
  );

/**
 * Tarball entries holding runtime code that {@link KIBANA_PRUNED_NAMES}
 * deletes, by a directory's name or the file's own. A manifest's `bin` target
 * directly under the package's `bin` directory is exempt: a command's
 * launcher, which nothing imports.
 *
 * @param {readonly string[]} entries
 * @param {string | Record<string, string>} [bin]
 */
export const prunedRuntimeFiles = (entries, bin) => {
  const launchers = new Set(
    binTargets(bin).filter((target) => /^bin\/[^/]+$/i.test(target))
  );
  return entries.filter(
    (entry) =>
      RUNTIME_CODE.test(entry) &&
      !launchers.has(entry) &&
      entry.split('/').some((segment) => prunedName.test(segment))
  );
};
