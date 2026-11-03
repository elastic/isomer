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
    if (end === -1) {
      return esql.length;
    }
    // The lexer takes up to two more quotes as part of a raw string's closing run.
    let close = end + 3;
    while (close < end + 5 && esql[close] === '"') {
      close += 1;
    }
    return close;
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
    let index = start + 2;
    while (
      index < esql.length &&
      esql[index] !== '\n' &&
      esql[index] !== '\r'
    ) {
      index += 1;
    }
    return index;
  }
  if (esql.startsWith('/*', start)) {
    let depth = 1;
    let index = start + 2;
    while (index < esql.length && depth > 0) {
      if (esql.startsWith('/*', index)) {
        depth += 1;
        index += 2;
      } else if (esql.startsWith('*/', index)) {
        depth -= 1;
        index += 2;
      } else {
        index += 1;
      }
    }
    return index;
  }
  return start;
};

/**
 * The named and numbered parameters (`?name`, `??name`, `?1`) an ES|QL query references, in first-use order,
 * or `undefined` when it has an anonymous `?`, which a host could only bind by position.
 * A lexical scan: strings, quoted identifiers and comments (which nest) are skipped, nothing is parsed.
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
