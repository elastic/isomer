/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CheckReport, CheckResult } from './check';

export type ReportFormat = 'json' | 'junit';

const XML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char);

const caseName = ({ example, check }: CheckResult): string =>
  example === undefined ? check : `${example} › ${check}`;

const testCase = (result: CheckResult): string => {
  const { primitive, status, message = '' } = result;
  const open = `    <testcase classname="${escapeXml(primitive)}" name="${escapeXml(caseName(result))}"`;
  switch (status) {
    case 'passed':
      return `${open} />`;
    case 'skipped':
      return `${open}>\n      <skipped message="${escapeXml(message)}" />\n    </testcase>`;
    case 'failed':
      return `${open}>\n      <failure message="${escapeXml(message.split('\n')[0] ?? '')}">${escapeXml(message)}</failure>\n    </testcase>`;
  }
};

/** One `testsuite` per primitive, one `testcase` per check. */
export const toJunit = ({
  title,
  results,
  failed,
  skipped,
}: CheckReport): string => {
  const primitives = [...new Set(results.map(({ primitive }) => primitive))];
  const suites = primitives.map((primitive) => {
    const cases = results.filter((result) => result.primitive === primitive);
    const count = (status: CheckResult['status']) =>
      cases.filter((result) => result.status === status).length;
    return [
      `  <testsuite name="${escapeXml(primitive)}" tests="${cases.length}" failures="${count('failed')}" skipped="${count('skipped')}">`,
      ...cases.map(testCase),
      '  </testsuite>',
    ].join('\n');
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites name="${escapeXml(title)}" tests="${results.length}" failures="${failed}" skipped="${skipped}">`,
    ...suites,
    '</testsuites>',
    '',
  ].join('\n');
};

export const formatReport = (
  report: CheckReport,
  format: ReportFormat
): string =>
  format === 'junit' ? toJunit(report) : `${JSON.stringify(report, null, 2)}\n`;

/** Every failure, then the totals, for the terminal. */
export const summarizeReport = ({
  title,
  results,
  passed,
  failed,
  skipped,
}: CheckReport): string =>
  [
    ...results
      .filter(({ status }) => status === 'failed')
      .map(
        (result) =>
          `✗ ${result.primitive} › ${caseName(result)}\n  ${(result.message ?? '').split('\n').join('\n  ')}`
      ),
    `${title}: ${passed} passed, ${failed} failed, ${skipped} skipped.`,
    '',
  ].join('\n');
