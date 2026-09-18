/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// One import-specifier scanner for every script that walks emitted JavaScript.

const withoutComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const isIdentChar = (ch) => /[A-Za-z0-9_$]/.test(ch);

const skipQuoted = (source, start) => {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length) {
    if (source[i] === '\\') {
      i += 2;
      continue;
    }
    if (source[i] === quote) {
      return i + 1;
    }
    i += 1;
  }
  return source.length;
};

const keywordAt = (source, index, keyword) => {
  if (!source.startsWith(keyword, index)) {
    return false;
  }
  if (index > 0 && isIdentChar(source[index - 1])) {
    return false;
  }
  const after = source[index + keyword.length];
  return after === undefined || !isIdentChar(after);
};

const tokenize = (source) => {
  const specifiers = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      i = skipQuoted(source, i);
      continue;
    }

    const keyword = keywordAt(source, i, 'from')
      ? 'from'
      : keywordAt(source, i, 'import')
        ? 'import'
        : keywordAt(source, i, 'require')
          ? 'require'
          : undefined;
    if (keyword === undefined) {
      i += 1;
      continue;
    }

    let j = i + keyword.length;
    while (j < source.length && /\s/.test(source[j])) {
      j += 1;
    }
    if (source[j] === '(') {
      j += 1;
      while (j < source.length && /\s/.test(source[j])) {
        j += 1;
      }
    }
    if (source[j] === "'" || source[j] === '"') {
      const quote = source[j];
      j += 1;
      let specifier = '';
      while (j < source.length && source[j] !== quote) {
        if (source[j] === '\\') {
          specifier += source[j + 1] ?? '';
          j += 2;
          continue;
        }
        specifier += source[j];
        j += 1;
      }
      specifiers.push(specifier);
      i = j + 1;
      continue;
    }

    i += 1;
  }
  return specifiers;
};

/** Every static, dynamic, and `require` specifier in `source`, comments excluded. */
export const specifiersIn = (source) => tokenize(withoutComments(source));
