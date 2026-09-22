/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalReport } from './types';

const percent = (part: number, whole: number): string =>
  whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`;

const round2 = (value: number | undefined): string =>
  value === undefined ? '—' : value.toFixed(2);

/**
 * The report as text.
 *
 * Returned rather than printed: where a run is recorded is the caller's
 * decision, and this package writes nothing.
 */
export const formatReport = ({ results, totals }: EvalReport): string => {
  const rows: [string, string][] = [
    ['cases', String(totals.cases)],
    ['parsed', `${totals.parsed} (${percent(totals.parsed, totals.cases)})`],
    ['valid', `${totals.valid} (${percent(totals.valid, totals.cases)})`],
    [
      'valid after retry',
      `${totals.validAfterRetry} (${percent(totals.validAfterRetry, totals.cases)})`,
    ],
    ['mean selection F1', round2(totals.meanSelectionF1)],
  ];
  if (totals.answerability) {
    const { yes, partial, no } = totals.answerability;
    rows.push(['answerability', `yes ${yes} / partial ${partial} / no ${no}`]);
  }
  const width = Math.max(...rows.map(([label]) => label.length)) + 1;
  const lines = rows.map(([label, value]) => `${label.padEnd(width)}${value}`);

  const failures = results.filter(({ validity }) => !validity.valid);
  if (failures.length > 0) {
    lines.push('', 'invalid:');
    for (const { caseId, validity } of failures) {
      const first = validity.errors[0] ?? 'did not parse';
      const more =
        validity.errors.length > 1 ? ` (+${validity.errors.length - 1})` : '';
      lines.push(`  ${caseId}: ${first}${more}`);
    }
  }

  const invented = results.filter(
    ({ payload }) => payload.unknownTypes.length > 0
  );
  if (invented.length > 0) {
    lines.push('', 'invented node types:');
    for (const { caseId, payload } of invented) {
      lines.push(`  ${caseId}: ${payload.unknownTypes.join(', ')}`);
    }
  }

  return lines.join('\n');
};
