/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Every non-empty string in a node except those under `enumKeys`, for finding authored copy in a surface's output. */
export const authoredStrings = (enumKeys: readonly string[]) => {
  const skip = new Set(enumKeys);
  const walk = (value: unknown, key = ''): string[] => {
    if (typeof value === 'string') {
      return skip.has(key) || value === '' ? [] : [value];
    }
    if (Array.isArray(value)) {
      return value.flatMap((entry) => walk(entry));
    }
    if (value && typeof value === 'object') {
      return Object.entries(value).flatMap(([k, v]) => walk(v, k));
    }
    return [];
  };
  return walk;
};

/** Every string in Slack blocks, entity-decoded, so authored copy can be found in it. */
export const slackText = (value: unknown): string =>
  JSON.stringify(value)
    .match(/"(?:[^"\\]|\\.)*"/g)
    ?.map((literal) => JSON.parse(literal) as string)
    .join('\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&') ?? '';
