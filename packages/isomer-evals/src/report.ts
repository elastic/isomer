/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alignRows, percent, rounded } from './format';
import type { EvalReport } from './types';

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
    ['mean selection F1', rounded(totals.meanSelectionF1, 2)],
    [
      'expected primitive',
      `${totals.expectedHits} of ${totals.expectedCases} (${percent(totals.expectedHits, totals.expectedCases)})`,
    ],
  ];
  if (totals.answerability) {
    const { yes, partial, no } = totals.answerability;
    rows.push(['answerability', `yes ${yes} / partial ${partial} / no ${no}`]);
  }
  const lines = alignRows(rows);

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
