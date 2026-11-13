/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A diagnostic located in a package installed from npm, rather than in the consumer or a packed Isomer package. */
const isThirdParty = (diagnostic) => {
  const [path] = diagnostic.split('(');
  return (
    /(^|\/)node_modules\//.test(path) &&
    !/node_modules\/@elastic\/isomer-/.test(path)
  );
};

/**
 * Splits `tsc --pretty false` output into this repository's diagnostics and third parties'.
 *
 * @param {string} output
 */
export const splitDiagnostics = (output) => {
  // Each diagnostic starts at column zero; its continuation lines are indented.
  const diagnostics = output.split('\n').reduce((all, line) => {
    if (line === '') {
      return all;
    }
    if (/^\s/.test(line) && all.length > 0) {
      return [...all.slice(0, -1), `${all[all.length - 1]}\n${line}`];
    }
    return [...all, line];
  }, /** @type {string[]} */ ([]));
  return {
    own: diagnostics.filter((diagnostic) => !isThirdParty(diagnostic)),
    thirdParty: diagnostics.filter(isThirdParty),
  };
};
