/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentEvalReport } from './agent_types';

const percent = (part: number, whole: number): string =>
  whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`;

const rounded = (value: number | undefined, digits = 0): string =>
  value === undefined ? '—' : value.toFixed(digits);

/** The agent report as text, returned rather than printed. */
export const formatAgentReport = ({
  results,
  totals,
}: AgentEvalReport): string => {
  const rows: [string, string][] = [
    ['runs', String(totals.runs)],
    [
      'finished',
      `${totals.finished} (${percent(totals.finished, totals.runs)})`,
    ],
    ['valid', `${totals.valid} (${percent(totals.valid, totals.runs)})`],
    [
      'expected primitive',
      `${totals.expectedHits} of ${totals.expectedRuns} (${percent(totals.expectedHits, totals.expectedRuns)})`,
    ],
    ['mean turns', rounded(totals.meanTurns, 1)],
    ['mean input tokens', rounded(totals.meanInputTokens)],
    ['mean output tokens', rounded(totals.meanOutputTokens)],
    ['mean tool result bytes', rounded(totals.meanToolResultBytes)],
    [
      'calls per run',
      Object.entries(totals.callsPerRun)
        .map(([name, count]) => `${name} ${count.toFixed(1)}`)
        .join(', ') || '—',
    ],
  ];
  const width = Math.max(...rows.map(([label]) => label.length)) + 1;
  const lines = rows.map(([label, value]) => `${label.padEnd(width)}${value}`);

  const misses = results.filter(({ expected }) => expected?.hit === false);
  if (misses.length > 0) {
    lines.push('', 'missed the expected primitive:');
    for (const { caseId, run, expected } of misses) {
      lines.push(
        `  ${caseId} #${run}: used ${expected?.used.join(', ') || 'none'}`
      );
    }
  }

  const failures = results.filter(({ valid }) => !valid);
  if (failures.length > 0) {
    lines.push('', 'invalid or unfinished:');
    for (const { caseId, run, errors } of failures) {
      const more = errors.length > 1 ? ` (+${errors.length - 1})` : '';
      lines.push(`  ${caseId} #${run}: ${errors[0] ?? 'invalid'}${more}`);
    }
  }
  return lines.join('\n');
};
