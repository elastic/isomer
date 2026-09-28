/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { core } from 'zod';

import {
  jsonLine,
  listBounded,
  nameText,
  quoteInput,
} from '../composition/one_line';
import type { ValidationError } from '../composition/validation_error';

/**
 * Builds a `body[3].items[0].label` style path from a Zod issue path. Empty
 * when the issue is at the schema root. A key with other characters is quoted,
 * as in `meta["a b"]`.
 */
export const formatPath = (
  segments: ReadonlyArray<PropertyKey>,
  basePath = ''
): string => {
  let result = basePath;
  segments.forEach((segment) => {
    if (typeof segment === 'number') {
      result += `[${segment}]`;
    } else {
      const text = String(segment);
      const name = nameText(text);
      if (name !== text) {
        result += `[${name}]`;
      } else {
        result += result ? `.${text}` : text;
      }
    }
  });
  return result;
};

/**
 * Converts one Zod issue into a {@link ValidationError}.
 *
 * Schemas encode only the predicate (`must contain at least one bar`), so the
 * path stays separate. Missing required fields, enum issues, and unknown keys
 * are worded centrally, which is what keeps per-schema messages from restating
 * that boilerplate.
 *
 * Parse with `{ reportInput: true }`: Zod 4 omits `input` from an issue
 * otherwise, and a wrong type would then read as a missing field.
 */
export const formatZodIssue = (
  issue: core.$ZodIssue,
  basePath = ''
): ValidationError => {
  const path = formatPath(issue.path, basePath);

  if (isMissingRequired(issue)) {
    return { path, message: 'is required' };
  }

  if (issue.code === 'invalid_value' && Array.isArray(issue.values)) {
    return { path, message: oneOf(issue.values, issue.input) };
  }

  if (issue.code === 'unrecognized_keys') {
    return {
      path,
      message: `has unrecognized key(s): ${listBounded(issue.keys.map(quoteInput))}`,
    };
  }

  if (issue.code === 'invalid_union') {
    const { options } = issue as { options?: unknown };
    if (Array.isArray(options)) {
      const { discriminator, input } = issue as {
        discriminator?: string;
        input?: unknown;
      };
      const value =
        discriminator !== undefined &&
        typeof input === 'object' &&
        input !== null
          ? (input as Record<string, unknown>)[discriminator]
          : input;
      return { path, message: oneOf(options, value) };
    }
  }

  // Zod's own size wording (`Too small: expected string to have >=1
  // characters`) is rewritten; a schema's custom message is left alone.
  if (issue.code === 'too_small' && issue.message.startsWith('Too small')) {
    return {
      path,
      message: sizeMessage('at least', issue.origin, issue.minimum),
    };
  }
  if (issue.code === 'too_big' && issue.message.startsWith('Too big')) {
    return {
      path,
      message: sizeMessage('at most', issue.origin, issue.maximum),
    };
  }

  return { path, message: issue.message };
};

/** Edits between `a` and `b`: insertions, deletions, and substitutions. */
const editDistance = (a: string, b: string): number => {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
};

/** Longest input a misspelling suggestion is computed for; the edit distance is quadratic in it. */
const MAX_SUGGESTED_CHARS = 200;

/** `must be one of: …`, led by the closest option when `input` looks like a misspelling of one. */
const oneOf = (options: readonly unknown[], input: unknown): string => {
  const list = `must be one of: ${options
    .map((option) =>
      typeof option === 'string' ? nameText(option) : jsonLine(option)
    )
    .join(', ')}`;
  // A quoted input is cut to 100 characters, so a suggestion for a longer one would name nothing readable.
  if (typeof input !== 'string' || input.length > MAX_SUGGESTED_CHARS) {
    return list;
  }
  const limit = Math.max(2, input.length / 4);
  // The length difference is a lower bound on the distance, so this skips no match and bounds the work by the options' length.
  const [closest] = options
    .filter((option): option is string => typeof option === 'string')
    .filter((option) => Math.abs(option.length - input.length) <= limit)
    .map((option) => ({ option, distance: editDistance(input, option) }))
    .filter(({ distance }) => distance <= limit)
    .sort((a, b) => a.distance - b.distance);
  return closest === undefined
    ? list
    : `is ${quoteInput(input)}; did you mean ${quoteInput(closest.option)}? It ${list}`;
};

const sizeMessage = (
  bound: 'at least' | 'at most',
  origin: string,
  limit: number | bigint
): string => {
  if (origin === 'string') {
    return bound === 'at least' && limit === 1
      ? 'must not be empty'
      : `must be ${bound} ${limit} characters`;
  }
  if (origin === 'array' || origin === 'set') {
    return bound === 'at least' && limit === 1
      ? 'must not be empty'
      : `must have ${bound} ${limit} items`;
  }
  return `must be ${bound} ${limit}`;
};

const isMissingRequired = (issue: core.$ZodIssue): boolean => {
  if (issue.code !== 'invalid_type') {
    return false;
  }
  const { input } = issue as { input?: unknown };
  return input === undefined;
};

/** {@link formatZodIssue} over an issue list. */
export const formatZodIssues = (
  issues: ReadonlyArray<core.$ZodIssue>,
  basePath = ''
): ValidationError[] => issues.map((issue) => formatZodIssue(issue, basePath));
