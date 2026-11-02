/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DISPLAY_LIMIT = 100_000;

/** Serialize validated results without ever constructing their full expanded JSON. */
export const inspectorOutput = (
  value: unknown
): { text: string } | { error: string } => {
  const fragments: string[] = [];
  let remaining = DISPLAY_LIMIT;
  const append = (text: string): boolean => {
    if (text.length > remaining) {
      return false;
    }
    remaining -= text.length;
    fragments.push(text);
    return true;
  };
  const write = (entry: unknown, depth: number): boolean => {
    if (
      entry === null ||
      typeof entry === 'string' ||
      typeof entry === 'number' ||
      typeof entry === 'boolean'
    ) {
      return append(JSON.stringify(entry));
    }
    if (typeof entry !== 'object') {
      throw new TypeError('Inspector results must contain only JSON values');
    }
    const array = Array.isArray(entry);
    const entries: [string, unknown][] = array
      ? entry.map((item: unknown, index) => [String(index), item])
      : Object.entries(entry);
    if (!append(array ? '[' : '{')) {
      return false;
    }
    if (entries.length > 0) {
      if (!append('\n')) {
        return false;
      }
      for (const [index, [key, item]] of entries.entries()) {
        if (!append('  '.repeat(depth + 1))) {
          return false;
        }
        if (!array && !append(`${JSON.stringify(key)}: `)) {
          return false;
        }
        if (!write(item, depth + 1)) {
          return false;
        }
        if (!append(index === entries.length - 1 ? '\n' : ',\n')) {
          return false;
        }
      }
      if (!append('  '.repeat(depth))) {
        return false;
      }
    }
    return append(array ? ']' : '}');
  };
  return write(value, 0)
    ? { text: fragments.join('') }
    : {
        error:
          'Result exceeds the 100,000-character display budget. Reduce the input or inspect fewer columns, rows or references. No partial result is displayed.',
      };
};
