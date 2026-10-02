/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { core, ZodObject } from 'zod';

import { nameText } from '../composition/one_line';
import type { ValidationError } from '../composition/validation_error';

/**
 * Builds a `body[3].items[0].label` style path from a Zod issue path. Empty
 * when the issue is at the schema root.
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
      result += result ? `.${text}` : text;
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
    return { path, message: oneOf(issue.values) };
  }

  if (issue.code === 'unrecognized_keys') {
    return {
      path,
      message: `has unrecognized key(s): ${issue.keys.map(nameText).join(', ')}`,
    };
  }

  if (issue.code === 'invalid_union') {
    const { options } = issue as { options?: unknown };
    if (Array.isArray(options)) {
      return { path, message: oneOf(options) };
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

/** Fields every node takes, which {@link declaredFieldsNote} leaves out. */
const COMMON_NODE_FIELDS = new Set(['type', 'id', 'surfaces']);

/** What an unknown-key error on a node of `schema` adds: the fields that node declares. */
export const declaredFieldsNote = ({ shape }: ZodObject): string => {
  const declared = Object.keys(shape).filter(
    (key) => !COMMON_NODE_FIELDS.has(key)
  );
  return declared.length === 0
    ? 'it declares no fields'
    : `its fields are ${declared.map(nameText).join(', ')}`;
};

export const oneOf = (options: readonly unknown[]): string =>
  `must be one of: ${options
    .map((option) =>
      typeof option === 'string' ? nameText(option) : String(option)
    )
    .join(', ')}`;

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

/**
 * Zod issues as {@link ValidationError}s, in order, each path under `basePath`.
 *
 * Missing required fields, enum issues, and unknown keys are worded centrally,
 * so a schema's own messages state only the predicate. Parse with
 * `{ reportInput: true }`: Zod 4 omits `input` from an issue otherwise, and a
 * wrong type would then read as a missing field.
 */
export const formatZodIssues = (
  issues: ReadonlyArray<core.$ZodIssue>,
  basePath = ''
): ValidationError[] => issues.map((issue) => formatZodIssue(issue, basePath));
