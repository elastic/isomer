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
