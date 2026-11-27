/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BenchResult, Measure, Scenario } from './results';

/** One measure of one scenario, as each side's median and the change from `a` to `b`. */
export interface Delta {
  a: number;
  b: number;
  delta: number;
  /** The change as a percentage of `a`; `null` when `a` is 0. */
  percent: number | null;
}

export type Comparison = Record<string, Record<string, Delta>>;

/** Each measure both sides have a median for, per scenario, with the change from `a` to `b`. */
export const compareSummaries = (
  a: BenchResult['summary'],
  b: BenchResult['summary'],
  scenarios: readonly Scenario[],
  measures: readonly Measure[]
): Comparison =>
  Object.fromEntries(
    scenarios.map(({ name }) => [
      name,
      Object.fromEntries(
        measures.flatMap(({ key }) => {
          const before = a[name]?.[key]?.median;
          const after = b[name]?.[key]?.median;
          if (before === undefined || after === undefined) {
            return [];
          }
          return [
            [
              key,
              {
                a: before,
                b: after,
                delta: after - before,
                percent:
                  before === 0 ? null : ((after - before) / before) * 100,
              },
            ],
          ];
        })
      ),
    ])
  );

const fixed = (value: number, digits: number) => {
  const text = value.toFixed(digits);
  // A tiny negative difference rounds to `-0.0`.
  return Number(text) === 0 ? (0).toFixed(digits) : text;
};

const signed = (value: number, digits: number) => {
  const text = fixed(value, digits);
  return Number(text) > 0 ? `+${text}` : text;
};

/** A row per scenario and measure: each side's median, and the change in units and in percent. */
export const comparisonToMarkdown = ({
  measures,
  scenarios,
  comparison,
  labels,
}: {
  measures: readonly Measure[];
  scenarios: readonly Scenario[];
  comparison: Comparison;
  labels: { a: string; b: string };
}): string =>
  [
    `| Scenario | Measure | ${labels.a} | ${labels.b} | Change | Change (%) |`,
    '| --- | --- | ---: | ---: | ---: | ---: |',
    ...scenarios.flatMap(({ name }) =>
      measures.flatMap(({ key, label, digits }) => {
        const each = comparison[name]?.[key];
        return each === undefined
          ? []
          : [
              `| \`${name}\` | ${label} | ${fixed(each.a, digits)} | ${fixed(each.b, digits)} | ${signed(each.delta, digits)} | ${
                each.percent === null ? '' : `${signed(each.percent, 0)}%`
              } |`,
            ];
      })
    ),
  ].join('\n');

/** What one drawn example hashed to: its snapshot markup and its PNG. */
export interface Drawn {
  markup: string;
  png: string;
}

/**
 * Each example that differs between two drawings of the same examples, by
 * name, with what differs: its markup, its PNG, or that only one side drew it.
 */
export const parityProblems = (
  a: Record<string, Drawn>,
  b: Record<string, Drawn>,
  labels: { a: string; b: string }
): string[] =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .sort()
    .flatMap((name) => {
      const before = a[name];
      const after = b[name];
      if (before === undefined) {
        return [`${name}: drawn only with ${labels.b}`];
      }
      if (after === undefined) {
        return [`${name}: drawn only with ${labels.a}`];
      }
      const differs = [
        ...(before.markup === after.markup ? [] : ['markup']),
        ...(before.png === after.png ? [] : ['PNG']),
      ];
      return differs.length === 0
        ? []
        : [`${name}: ${differs.join(' and ')} differ`];
    });

/** `name=value`, split at its first `=`, for the option it came from. */
export const parsePair = (
  raw: string | undefined,
  option: string
): { name: string; value: string } => {
  const at = raw?.indexOf('=') ?? -1;
  if (raw === undefined || at < 1 || at === raw.length - 1) {
    throw new Error(
      `${option} ${raw ?? ''}: give it as <package>=<value>`.trim()
    );
  }
  return { name: raw.slice(0, at), value: raw.slice(at + 1) };
};
