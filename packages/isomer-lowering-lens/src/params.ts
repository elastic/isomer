/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const WORD = /[A-Za-z0-9_]/;

/** The end of the quoted, backquoted or commented run starting at `start`, or `start` if there is none. */
const skip = (esql: string, start: number): number => {
  if (esql.startsWith('"""', start)) {
    const end = esql.indexOf('"""', start + 3);
    return end === -1 ? esql.length : end + 3;
  }
  const open = esql[start];
  if (open === '"' || open === '`') {
    let index = start + 1;
    while (index < esql.length && esql[index] !== open) {
      index += open === '"' && esql[index] === '\\' ? 2 : 1;
    }
    return index + 1;
  }
  if (esql.startsWith('//', start)) {
    const end = esql.indexOf('\n', start);
    return end === -1 ? esql.length : end;
  }
  if (esql.startsWith('/*', start)) {
    const end = esql.indexOf('*/', start + 2);
    return end === -1 ? esql.length : end + 2;
  }
  return start;
};

/**
 * The named and numbered parameters (`?name`, `??name`, `?1`) an ES|QL query references, in first-use order,
 * or `undefined` when it has an anonymous `?`, which a host could only bind by position.
 * A lexical scan: strings, quoted identifiers and comments are skipped, nothing is parsed.
 */
export const queryParams = (esql: string): string[] | undefined => {
  const names = new Set<string>();
  let index = 0;
  while (index < esql.length) {
    const next = skip(esql, index);
    if (next !== index) {
      index = next;
      continue;
    }
    if (esql[index] !== '?') {
      index += 1;
      continue;
    }
    let start = index + 1;
    if (esql[start] === '?') {
      start += 1;
    }
    let end = start;
    while (end < esql.length && WORD.test(esql[end]!)) {
      end += 1;
    }
    if (end === start) {
      return undefined;
    }
    names.add(esql.slice(start, end));
    index = end;
  }
  return [...names];
};
