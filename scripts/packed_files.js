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
 * Directory names a host's build may delete from `node_modules`: Kibana's does,
 * wherever they sit in a package.
 */
export const PRUNED_DIRECTORY_NAMES = [
  'bin',
  'demo',
  'doc',
  'docs',
  'example',
  'examples',
  'samples',
  'test',
  'tests',
];

const RUNTIME_CODE = /\.(c|m)?js$|\.json$|\.node$|\.wasm$/;

const binTargets = (bin) =>
  (typeof bin === 'string' ? [bin] : Object.values(bin ?? {})).map((target) =>
    target.replace(/^\.\//, '')
  );

/**
 * Tarball entries holding runtime code under a {@link PRUNED_DIRECTORY_NAMES}
 * directory. A manifest's `bin` targets are exempt: a command, not a module the
 * package loads.
 *
 * @param {readonly string[]} entries
 * @param {string | Record<string, string>} [bin]
 */
export const prunedRuntimeFiles = (entries, bin) => {
  const exempt = new Set(binTargets(bin));
  return entries.filter(
    (entry) =>
      RUNTIME_CODE.test(entry) &&
      !exempt.has(entry) &&
      entry
        .split('/')
        .slice(0, -1)
        .some((segment) => PRUNED_DIRECTORY_NAMES.includes(segment))
  );
};
