/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseContext } from './case';
import {
  type Fingerprint,
  FINGERPRINT_KINDS,
  type Tolerance,
} from './fingerprint';
import { KNOWN_GAPS, type KnownGap } from './known_gaps';

export interface Difference {
  /** The field, such as `tiles[0].secondary.value`. */
  path: string;
  feature: string;
  reference: unknown;
  actual: unknown;
  tolerance: Tolerance;
  /** Set when the difference is a recorded gap, which does not fail the comparison. */
  gap?: KnownGap;
  /** Set when the field cannot be compared where it was drawn, which does not fail the comparison either. */
  uncompared?: string;
}

/** What the drawing was made under, read where it was drawn. */
export interface DrawnContext {
  scheme: CaseContext['scheme'];
  deviceScaleFactor: number;
  platform: CaseContext['platform'];
}

/** Features whose readings depend on how the platform rasterizes text. */
const PLATFORM_FEATURES = new Set(['layout.text']);

const EXACT: Tolerance = { type: 'exact' };

const pattern = (path: (string | number)[]) =>
  path
    .map((part) => (typeof part === 'number' ? '[]' : `.${part}`))
    .join('')
    .replace(/^\./, '');

const display = (path: (string | number)[]) =>
  path
    .map((part) => (typeof part === 'number' ? `[${part}]` : `.${part}`))
    .join('')
    .replace(/^\./, '');

const within = (tolerance: Tolerance, reference: unknown, actual: unknown) =>
  tolerance.type === 'exact' ||
  typeof reference !== 'number' ||
  typeof actual !== 'number'
    ? Object.is(reference, actual)
    : Math.abs(reference - actual) <= tolerance.max;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const gapFor = (reference: Fingerprint, path: (string | number)[]) => {
  const holder = path
    .slice(0, -1)
    .reduce<unknown>(
      (value, key) =>
        (value as Record<string | number, unknown> | undefined)?.[key],
      reference
    );
  const field = String(path.at(-1) ?? '');
  return KNOWN_GAPS.find(
    ({ kind, path: match, when }) =>
      kind === reference.kind &&
      match.test(pattern(path)) &&
      (!when || (isObject(holder) && when(holder, field)))
  );
};

/**
 * Every field where `actual` differs from `reference` beyond its feature's tolerance. Tolerances belong to
 * feature classes, so no case can loosen one.
 */
export const compareFingerprints = (
  reference: Fingerprint,
  actual: Fingerprint | null,
  context?: { expected: CaseContext; drawn: DrawnContext }
): Difference[] => {
  const differences: Difference[] = [];
  const uncomparable = (feature: string) =>
    context !== undefined &&
    context.expected.platform !== context.drawn.platform &&
    PLATFORM_FEATURES.has(feature);
  const { classes } = FINGERPRINT_KINDS[reference.kind];
  const classify = (path: (string | number)[]) => {
    const key = pattern(path);
    return (
      classes.find(({ path: match }) => match.test(key)) ?? {
        feature: key || 'drawing',
        tolerance: EXACT,
      }
    );
  };
  const differ = (
    path: (string | number)[],
    expected: unknown,
    got: unknown
  ) => {
    const { feature, tolerance } = classify(path);
    const gap = gapFor(reference, path);
    differences.push({
      path: display(path) || '(drawing)',
      feature,
      reference: expected,
      actual: got,
      tolerance,
      ...(gap ? { gap } : {}),
      ...(!gap && uncomparable(feature)
        ? {
            uncompared: `Compared only on ${context!.expected.platform}, where the reference was captured.`,
          }
        : {}),
    });
  };
  const walk = (expected: unknown, got: unknown, path: (string | number)[]) => {
    if (Array.isArray(expected) && Array.isArray(got)) {
      if (expected.length !== got.length) {
        differ(path, expected.length, got.length);
        return;
      }
      expected.forEach((item, index) =>
        walk(item, got[index], [...path, index])
      );
      return;
    }
    if (isObject(expected) && isObject(got)) {
      const keys = new Set([...Object.keys(expected), ...Object.keys(got)]);
      for (const key of keys) {
        walk(expected[key], got[key], [...path, key]);
      }
      return;
    }
    if (!within(classify(path).tolerance, expected, got)) {
      differ(path, expected, got);
    }
  };

  if (context) {
    const { expected, drawn } = context;
    if (expected.scheme !== drawn.scheme) {
      differences.push({
        path: 'context.scheme',
        feature: 'context',
        reference: expected.scheme,
        actual: drawn.scheme,
        tolerance: EXACT,
      });
    }
    if (expected.deviceScaleFactor !== drawn.deviceScaleFactor) {
      differences.push({
        path: 'context.deviceScaleFactor',
        feature: 'context',
        reference: expected.deviceScaleFactor,
        actual: drawn.deviceScaleFactor,
        tolerance: EXACT,
      });
    }
  }
  if (!actual) {
    differ([], reference.kind, null);
    return differences;
  }
  walk(reference, actual, []);
  return differences;
};

/** Differences that fail the comparison: those no known gap covers and that could be compared. */
export const failures = (differences: readonly Difference[]) =>
  differences.filter(({ gap, uncompared }) => !gap && !uncompared);

/** The largest difference between numeric fields no known gap covers, per feature, for setting tolerances. */
export const deviations = (
  reference: Fingerprint,
  actual: Fingerprint
): Record<string, number> => {
  const { classes } = FINGERPRINT_KINDS[reference.kind];
  const largest: Record<string, number> = {};
  const walk = (expected: unknown, got: unknown, path: (string | number)[]) => {
    if (Array.isArray(expected) && Array.isArray(got)) {
      expected.forEach((item, index) =>
        walk(item, got[index], [...path, index])
      );
    } else if (isObject(expected) && isObject(got)) {
      for (const key of Object.keys(expected)) {
        walk(expected[key], got[key], [...path, key]);
      }
    } else if (
      typeof expected === 'number' &&
      typeof got === 'number' &&
      !gapFor(reference, path)
    ) {
      const key = pattern(path);
      const feature =
        classes.find(({ path: match }) => match.test(key))?.feature ?? key;
      largest[feature] = Math.max(
        largest[feature] ?? 0,
        Math.abs(expected - got)
      );
    }
  };
  walk(reference, actual, []);
  return largest;
};
