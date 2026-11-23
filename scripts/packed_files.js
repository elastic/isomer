/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import picomatch from 'picomatch';

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
 * What Kibana's build deletes from `node_modules`: the `match` list of
 * `CleanExtraFilesFromModules` in Kibana's `src/dev/build/tasks/clean_tasks.ts`
 * at `92e239bd05`, verbatim. Kibana matches it without regard to case.
 */
export const KIBANA_CLEAN_PATTERNS = [
  '!@kbn/**',
  '**/test',
  '**/tests',
  '**/jest.config.js',
  '**/__tests__',
  '**/*.test.js',
  '**/*.snap',
  '**/coverage',
  '**/doc',
  '!**/yaml/dist/**/doc',
  '**/docs',
  '**/README',
  '**/CONTRIBUTING.md',
  '**/README.*',
  '**/History.md',
  '**/HISTORY.md',
  '**/history.md',
  '**/CHANGELOG.md',
  '**/Changelog.md',
  '**/changelog.md',
  '**/CODE_OF_CONDUCT.md',
  '**/example',
  '**/examples',
  '**/demo',
  '**/samples',
  '**/.bin',
  '**/bin',
  '**/.eslintrc',
  '**/.eslintrc.js',
  '**/.eslintrc.yml',
  '**/.eslintrc.json',
  '**/.eslintignore',
  '**/.jshintignore',
  '**/.prettierrc',
  '**/.prettierrc.js',
  '**/.prettierrc.yaml',
  '**/.prettierrc.yml',
  '**/.jshintrc',
  '**/.babelrc',
  '**/.babelrc.js',
  '**/.jscs.json',
  '**/.lint',
  '**/.jscsrc',
  '**/.nycrc',
  '**/.taprc',
  '**/*.flow',
  '**/*.webidl',
  '**/*.map',
  '**/@types',
  '**/*.sh',
  '**/*.bat',
  '**/*.exe',
  '**/Gruntfile.js',
  '**/gulpfile.js',
  '**/Makefile',
  '**/*.coffee',
  '**/*.scss',
  '**/*.sass',
  '**/*.ts',
  '**/*.text',
  '**/*.tsx',
  '**/tsconfig.json',
  '**/.tsbuildinfo',
  '**/babel.config.*',
  '**/.editorconfig',
  '**/.vscode',
  '**/.idea',
  '**/.git',
  '**/.github',
  '**/.gitattributes',
  '**/.gitkeep',
  '**/.gitempty',
  '**/.gitmodules',
  '**/.keep',
  '**/.empty',
  '**/.patch',
  '**/.travis.yml',
  '**/.gitlab-ci.yml',
  '**/circle.yml',
  '**/.coveralls.yml',
  '**/.istanbul.yml',
  '**/.appveyor.yml',
  '**/.zuul.yml',
  '**/.codeclimate.yml',
  '**/.codecov.yml',
  '**/.airtap.yml',
  '**/.gitpod.yml',
  '**/karma.conf.ci.js',
  '**/karma.conf.js',
  '**/karma-ci.conf.js',
  '**/package-lock.json',
  '**/component.json',
  '**/bower.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/.pnpm',
  '**/.*ignore',
  '**/*.log',
  '**/.nvmrc',
  '**/.DS_Store',
  '**/Dockerfile',
  '**/docker-compose.yml',
  '**/*.{png,jpg,jpeg,gif,webp,zip,7z,rar,tar,tgz,gz,cc,pl,py,gz,h,xml,html}',
  '**/*.development.js',
  '**/*.dev.js',
  '**/benchmark',
  '**/benchmarks',
  '**/benchmark.js',
  '**/benchmarks.js',
  '**/@elastic/eui/es',
  '**/@elastic/eui/test-env',
  '**/@elastic/eui/optimize',
  '**/@elastic/eui/i18ntokens.json',
];

const negated = (pattern) => pattern.startsWith('!');

// As Kibana's `makeMatcher` builds it, over a path relative to `node_modules`.
const kibanaDeletes = picomatch(
  KIBANA_CLEAN_PATTERNS.filter((pattern) => !negated(pattern)),
  {
    nocase: true,
    nonegate: true,
    ignore: KIBANA_CLEAN_PATTERNS.filter(negated).map((pattern) =>
      pattern.slice(1)
    ),
  }
);

const RUNTIME_CODE = /\.(c|m)?js$|\.json$|\.node$|\.wasm$/i;

const binTargets = (bin) =>
  (typeof bin === 'string' ? [bin] : Object.values(bin ?? {})).map((target) =>
    target.replace(/^\.\//, '')
  );

/**
 * Tarball entries holding runtime code that Kibana's build deletes from the
 * installed package: the entry itself or a directory above it matches
 * {@link KIBANA_CLEAN_PATTERNS}, walked from `node_modules` as Kibana's
 * `scanDelete` walks. A manifest's `bin` target directly under the package's
 * `bin` directory is exempt: a command's launcher, which nothing imports.
 *
 * @param {{ name: string, bin?: string | Record<string, string> }} manifest
 * @param {readonly string[]} entries
 */
export const prunedRuntimeFiles = ({ name, bin }, entries) => {
  const launchers = new Set(
    binTargets(bin).filter((target) => /^bin\/[^/]+$/i.test(target))
  );
  return entries.filter((entry) => {
    if (!RUNTIME_CODE.test(entry) || launchers.has(entry)) {
      return false;
    }
    const segments = `${name}/${entry}`.split('/');
    return segments.some((_, index) =>
      kibanaDeletes(segments.slice(0, index + 1).join('/'))
    );
  });
};

/**
 * The packages `check:pack-contents` packs: every one that publishes, with a
 * `files` list or without.
 *
 * @template {{ manifest: object }} T
 * @param {readonly T[]} packages
 * @param {(manifest: object) => boolean} isPublishable
 * @returns {T[]}
 */
export const packedPackages = (packages, isPublishable) =>
  packages.filter(({ manifest }) => isPublishable(manifest));
