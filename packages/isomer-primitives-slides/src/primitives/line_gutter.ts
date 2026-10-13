/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { codeGutterGap } from '../theme/components/code';

/** One gutter label per line, each padded to the widest and followed by the gap; `undefined` leaves a line unnumbered. */
export const gutterLabels = (
  numbers: readonly (number | undefined)[]
): string[] => {
  const digits = Math.max(
    0,
    ...numbers.map((number) => (number === undefined ? 0 : `${number}`.length))
  );
  return numbers.map(
    (number) =>
      `${(number === undefined ? '' : `${number}`).padStart(digits)}${' '.repeat(codeGutterGap)}`
  );
};

/** Columns a gutter takes from its panel; none without one. */
export const gutterColumns = (labels: readonly string[] | undefined): number =>
  labels?.[0]?.length ?? 0;

/** `line` after its gutter label, as text, Markdown, and Slack print it. */
export const withGutter = (label: string | undefined, line: string): string =>
  label === undefined
    ? line
    : line === ''
      ? label.trimEnd()
      : `${label}${line}`;
