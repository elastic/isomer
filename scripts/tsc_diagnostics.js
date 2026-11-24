/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// `@elastic/charts` omits React's CSS custom-property index from `GeometryStateStyle`. From 73.5.0 its declarations are under `dist/cjs` and `dist/esm`.
const isKnownChartsError = (diagnostic) =>
  /^(?:.*\/)?node_modules\/@elastic\/charts\/dist\/(?:(?:cjs|esm)\/)?utils\/themes\/theme\.d\.m?ts\(\d+,\d+\): error TS2344: Type 'GeometryStateStyle' does not satisfy the constraint 'CSSProperties'\.(?:\n|$)/.test(
    diagnostic
  );

export const splitDiagnostics = (output) => {
  // Each diagnostic starts at column zero; its continuation lines are indented.
  const diagnostics = output.split(/\r?\n/).reduce((all, line) => {
    if (line === '') {
      return all;
    }
    if (/^\s/.test(line) && all.length > 0) {
      return [...all.slice(0, -1), `${all[all.length - 1]}\n${line}`];
    }
    return [...all, line];
  }, /** @type {string[]} */ ([]));
  return {
    errors: diagnostics.filter((diagnostic) => !isKnownChartsError(diagnostic)),
    known: diagnostics.filter(isKnownChartsError),
  };
};
